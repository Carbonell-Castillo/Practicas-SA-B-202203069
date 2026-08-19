from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from .database import Base, SessionLocal, engine
from .models import Product
from .rest import router as rest_router
from .schema import schema

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

app.include_router(rest_router)

graphql_app = GraphQLRouter(schema, graphiql=True)
app.include_router(graphql_app, prefix="/graphql")
