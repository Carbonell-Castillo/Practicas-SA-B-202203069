from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .database import get_db_session
from .models import Product

router = APIRouter(tags=["products"])


class ProductOut(BaseModel):
    id: int
    name: str
    description: str
    price: float
    stock: int

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str = Field(default="", max_length=500)
    price: float = Field(gt=0)
    stock: int = Field(ge=0, default=0)


@router.get("/health")
def health():
    return {"status": "ok", "service": "products-service"}


@router.get("/products", response_model=List[ProductOut])
def list_products(db: Session = Depends(get_db_session)):
    return db.query(Product).order_by(Product.id).all()


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db_session)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db_session)):
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product
