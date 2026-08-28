from typing import List, Optional

import strawberry

from .database import SessionLocal
from .models import Product


@strawberry.type
class ProductType:
    id: int
    name: str
    description: str
    price: float
    stock: int

    @staticmethod
    def from_orm(product: Product) -> "ProductType":
        return ProductType(
            id=product.id,
            name=product.name,
            description=product.description,
            price=float(product.price),
            stock=product.stock,
        )


@strawberry.type
class Query:
    @strawberry.field(description="Lista todos los productos del catálogo.")
    def products(self) -> List[ProductType]:
        db = SessionLocal()
        try:
            rows = db.query(Product).order_by(Product.id).all()
            return [ProductType.from_orm(row) for row in rows]
        finally:
            db.close()

    @strawberry.field(description="Obtiene un producto por id.")
    def product(self, id: int) -> Optional[ProductType]:
        db = SessionLocal()
        try:
            row = db.get(Product, id)
            return ProductType.from_orm(row) if row else None
        finally:
            db.close()


@strawberry.type
class Mutation:
    @strawberry.mutation(description="Crea un nuevo producto en el catálogo.")
    def create_product(
        self, name: str, description: str, price: float, stock: int
    ) -> ProductType:
        db = SessionLocal()
        try:
            product = Product(name=name, description=description, price=price, stock=stock)
            db.add(product)
            db.commit()
            db.refresh(product)
            return ProductType.from_orm(product)
        finally:
            db.close()

    @strawberry.mutation(
        description="Descuenta stock de un producto (usado por orders-service al confirmar una orden)."
    )
    def decrease_stock(self, id: int, quantity: int) -> ProductType:
        db = SessionLocal()
        try:
            product = db.get(Product, id)
            if product is None:
                raise ValueError(f"Producto {id} no existe")
            if product.stock < quantity:
                raise ValueError(f"Stock insuficiente para el producto {id}")
            product.stock -= quantity
            db.commit()
            db.refresh(product)
            return ProductType.from_orm(product)
        finally:
            db.close()


schema = strawberry.Schema(query=Query, mutation=Mutation)
