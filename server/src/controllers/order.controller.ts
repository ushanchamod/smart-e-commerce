import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares";
import { sendError, sendSuccess } from "../utils";
import { db } from "../db";
import {
  cartItemsTable,
  categoriesTable,
  orderItemsTable,
  ordersTable,
  productsTable,
} from "../db/schema";
import { and, eq, sql } from "drizzle-orm";
import { JWTPayloadType } from "../dto";
import { createOrderSchemaType } from "../validators/order.dto";

export const AddToCart = async (req: AuthenticatedRequest, res: Response) => {
  const { productId } = req.params;
  const user = req.user as JWTPayloadType;

  const { quantity } = req.body;

  try {
    const existingCartItem = await db
      .select()
      .from(cartItemsTable)
      .where(
        and(
          eq(cartItemsTable.productId, Number(productId)),
          eq(cartItemsTable.userId, user.userId)
        )
      );

    if (existingCartItem.length > 0) {
      // update quantity
      const updatedQuantity = existingCartItem[0].quantity + (quantity || 1);

      const updatedCartItem = await db
        .update(cartItemsTable)
        .set({ quantity: updatedQuantity })
        .where(
          and(
            eq(cartItemsTable.productId, Number(productId)),
            eq(cartItemsTable.userId, user.userId)
          )
        )
        .returning();

      return sendSuccess(res, updatedCartItem, "Item quantity updated in cart");
    } else {
      const newCartItem = await db
        .insert(cartItemsTable)
        .values({
          userId: user.userId,
          productId: Number(productId),
          quantity: quantity || 1,
        })
        .returning();

      return sendSuccess(res, newCartItem, "Item added to cart");
    }
  } catch (error) {
    return sendError(res, "INTERNAL_SERVER_ERROR", 500);
  }
};

export const GetMyCart = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user as JWTPayloadType;

  try {
    const cartItems = await db
      .select({
        id: productsTable.productId,
        name: productsTable.name,
        unitPrice: productsTable.price,
        quantity: cartItemsTable.quantity,
        description: productsTable.description,
        images: productsTable.image,
        category: categoriesTable.name,
        subtotal: sql`${productsTable.price} * ${cartItemsTable.quantity}`.as(
          "subtotal"
        ),
      })
      .from(cartItemsTable)
      .innerJoin(
        productsTable,
        eq(cartItemsTable.productId, productsTable.productId)
      )
      .innerJoin(
        categoriesTable,
        eq(productsTable.categoryId, categoriesTable.categoryId)
      )
      .where(eq(cartItemsTable.userId, user.userId));

    return sendSuccess(res, cartItems, "User cart items retrieved");
  } catch (error) {
    return sendError(res, "INTERNAL_SERVER_ERROR", 500);
  }
};

export const DeleteCartItem = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { itemId } = req.params;
  const user = req.user as JWTPayloadType;

  try {
    const deletedItem = await db
      .delete(cartItemsTable)
      .where(
        and(
          eq(cartItemsTable.userId, user.userId),
          eq(cartItemsTable.productId, Number(itemId))
        )
      )
      .returning();
    return sendSuccess(res, deletedItem, "Cart item deleted successfully");
  } catch (error) {
    return sendError(res, "INTERNAL_SERVER_ERROR", 500);
  }
};

export const CreateOrder = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user as JWTPayloadType;
  const { address, paymentMethod } = <createOrderSchemaType>req.body;

  try {
    const cartItems = await db
      .select({
        id: productsTable.productId,
        name: productsTable.name,
        unitPrice: productsTable.price,
        quantity: cartItemsTable.quantity,
        description: productsTable.description,
        images: productsTable.image,
        category: categoriesTable.name,
        subtotal: sql`${productsTable.price} * ${cartItemsTable.quantity}`.as(
          "subtotal"
        ),
      })
      .from(cartItemsTable)
      .innerJoin(
        productsTable,
        eq(cartItemsTable.productId, productsTable.productId)
      )
      .innerJoin(
        categoriesTable,
        eq(productsTable.categoryId, categoriesTable.categoryId)
      )
      .where(eq(cartItemsTable.userId, user.userId));

    if (cartItems.length === 0) {
      return sendError(res, "CART_EMPTY", 400);
    }

    // 2. calculate total amount
    let totalAmount = 0;
    for (const item of cartItems) {
      totalAmount += Number(item.subtotal);
    }
    // 3. create order record
    const transaction = await db.transaction(async (tx) => {
      const newOrder = await tx
        .insert(ordersTable)
        .values({
          userId: user.userId,
          address,
          totalAmount: String(totalAmount),
          paymentMethod,
        })
        .returning();

      const orderId = newOrder[0].orderId;

      // 4. create order items records
      for (const item of cartItems) {
        await tx.insert(orderItemsTable).values({
          orderId,
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      }

      return newOrder;
    });

    await db
      .delete(cartItemsTable)
      .where(eq(cartItemsTable.userId, user.userId));

    return sendSuccess(res, null, "Order created successfully");
  } catch (error) {
    console.log(error);
    return sendError(res, "INTERNAL_SERVER_ERROR", 500);
  }
};

export const GetAllOrder = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user as JWTPayloadType;

  try {
    const orders = await db
      .select({
        orderId: ordersTable.orderId,
        address: ordersTable.address,
        totalAmount: ordersTable.totalAmount,
        paymentMethod: ordersTable.paymentMethod,
        status: ordersTable.status,
        createdAt: ordersTable.createdAt,

        orderItems: sql`
          COALESCE(
            json_agg(
              json_build_object(
                'productId', ${orderItemsTable.productId},
                'quantity', ${orderItemsTable.quantity},
                'unitPrice', ${orderItemsTable.unitPrice},
                'productName',
                  (SELECT ${productsTable.name}
                   FROM ${productsTable}
                   WHERE ${productsTable.productId} = ${orderItemsTable.productId}
                   LIMIT 1),
                'productImage',
                  (SELECT ${productsTable.image}
                   FROM ${productsTable}
                   WHERE ${productsTable.productId} = ${orderItemsTable.productId}
                   LIMIT 1)
              )
            ) FILTER (WHERE ${orderItemsTable.orderId} IS NOT NULL),
          '[]')
        `.as("orderItems"),
      })
      .from(ordersTable)
      .leftJoin(
        orderItemsTable,
        eq(ordersTable.orderId, orderItemsTable.orderId)
      )
      .where(eq(ordersTable.userId, user.userId))
      .groupBy(ordersTable.orderId);

    return sendSuccess(res, orders, "User orders retrieved");
  } catch (error) {
    console.log(error);
    return sendError(res, "INTERNAL_SERVER_ERROR", 500);
  }
};

export const GetOrderById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const user = req.user as JWTPayloadType;
  const { id } = req.params;

  try {
    const order = await db
      .select({
        orderId: ordersTable.orderId,
        address: ordersTable.address,
        totalAmount: ordersTable.totalAmount,
        paymentMethod: ordersTable.paymentMethod,
        status: ordersTable.status,
        createdAt: ordersTable.createdAt,
        orderItems: sql`
          COALESCE(
            json_agg(
              json_build_object(
                'productId', ${orderItemsTable.productId},
                'quantity', ${orderItemsTable.quantity},
                'unitPrice', ${orderItemsTable.unitPrice},
                'productName',
                  (SELECT ${productsTable.name}
                    FROM ${productsTable} 
                    WHERE ${productsTable.productId} = ${orderItemsTable.productId}
                    LIMIT 1),
                'productImage',
                  (SELECT ${productsTable.image}
                    FROM ${productsTable} 
                    WHERE ${productsTable.productId} = ${orderItemsTable.productId}
                    LIMIT 1)
              )
            ) FILTER (WHERE ${orderItemsTable.orderId} IS NOT NULL),
          '[]')
        `.as("orderItems"),
      })
      .from(ordersTable)
      .leftJoin(
        orderItemsTable,
        eq(ordersTable.orderId, orderItemsTable.orderId)
      )
      .where(
        and(
          eq(ordersTable.userId, user.userId),
          eq(ordersTable.orderId, Number(id))
        )
      )
      .groupBy(ordersTable.orderId);
    if (order.length === 0) {
      return sendError(res, "ORDER_NOT_FOUND", 404);
    }
    return sendSuccess(res, order[0], "Order details retrieved");
  } catch (error) {
    console.log(error);
    return sendError(res, "INTERNAL_SERVER_ERROR", 500);
  }
};
