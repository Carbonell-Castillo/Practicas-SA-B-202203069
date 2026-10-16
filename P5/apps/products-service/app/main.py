from contextlib import asynccontextmanager
import json
import os
import time

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from strawberry.fastapi import GraphQLRouter

from .database import Base, SessionLocal, engine
from .models import Product
from .rest import router as rest_router
from .schema import schema

SERVICE = os.getenv("OTEL_SERVICE_NAME", "products-service")
provider = TracerProvider(resource=Resource.create({"service.name": SERVICE}))
endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
if endpoint:
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=f"{endpoint.rstrip('/')}/v1/traces")))
trace.set_tracer_provider(provider)
SQLAlchemyInstrumentor().instrument(engine=engine)

REQUESTS = Counter("http_server_requests_total", "Solicitudes HTTP recibidas", ["service", "method", "route", "status_code"])
DURATION = Histogram("http_server_request_duration_seconds", "Latencia HTTP del servidor", ["service", "method", "route", "status_code"], buckets=(.01, .05, .1, .25, .5, .75, 1, 2, 5))
INVENTORY_QUERIES = Counter("inventario_consultas_total", "Consultas al inventario", ["service"])


def structured_log(event: str, **fields) -> None:
    span = trace.get_current_span().get_span_context()
    print(json.dumps({"timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "level": "info", "service": SERVICE, "event": event, "trace_id": format(span.trace_id, "032x") if span.is_valid else "", **fields}), flush=True)

SEED_PRODUCTS = [
    {"name": "Teclado mecánico", "description": "Switches azules, layout US", "price": 45.99, "stock": 25},
    {"name": "Mouse inalámbrico", "description": "2.4GHz, sensor óptico 1600dpi", "price": 19.5, "stock": 40},
    {"name": "Monitor 27\" 144Hz", "description": "Panel IPS, HDMI + DisplayPort", "price": 229.0, "stock": 12},
    {"name": "SSD NVMe 1TB", "description": "Lectura hasta 3500MB/s", "price": 65.0, "stock": 30},
]


def seed_if_empty() -> None:
    db = SessionLocal()
    try:
        if db.query(Product).count() == 0:
            db.add_all(Product(**data) for data in SEED_PRODUCTS)
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_if_empty()
    yield


app = FastAPI(
    title="Products Service",
    description="Microservicio de catálogo de productos (Práctica 4). Expone REST + GraphQL.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def observe_request(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    route = request.scope.get("route")
    path = getattr(route, "path", request.url.path)
    labels = {"service": SERVICE, "method": request.method, "route": path, "status_code": str(response.status_code)}
    REQUESTS.labels(**labels).inc()
    DURATION.labels(**labels).observe(time.perf_counter() - started)
    if request.url.path.startswith(("/products", "/graphql")):
        INVENTORY_QUERIES.labels(service=SERVICE).inc()
    structured_log("http_request", method=request.method, route=path, status_code=response.status_code)
    return response


@app.get("/metrics", include_in_schema=False)
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

app.include_router(rest_router)

graphql_app = GraphQLRouter(schema, graphiql=True)
app.include_router(graphql_app, prefix="/graphql")
FastAPIInstrumentor.instrument_app(app)
