import { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { knex } from "../database";
import { checkSessionIdExist } from "../middleware/check-session-id-exist";

export async function transactionsRoute(app: FastifyInstance) {
  app.get(
    "/summary",
    {
      preHandler: [checkSessionIdExist],
    },
    async (request) => {
      const sessionId = request.cookies.sessionId;

      const summary = await knex("transactions")
        .where("session_id", sessionId)
        .sum("amount", { as: "amount" })
        .first();

      return {
        summary,
      };
    }
  );

  app.get(
    "/",
    {
      preHandler: [checkSessionIdExist],
    },
    async (request, reply) => {
      const sessionId = request.cookies.sessionId;
      const transactions = await knex("transactions")
        .where("session_id", sessionId)
        .select();

      return {
        transactions,
      };
    }
  );

  app.get(
    "/:id",
    {
      preHandler: [checkSessionIdExist],
    },
    async (request) => {
      const getTransactionsParamsSchema = z.object({
        id: z.string().uuid(),
      });

      const { id } = getTransactionsParamsSchema.parse(request.params);

      const sessionId = request.cookies.sessionId;

      const transactions = await knex("transactions")
        .where({
          id,
          session_id: sessionId,
        })
        .first();

      return {
        transactions,
      };
    }
  );

  app.post("/", async (request, reply) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(["credit", "debit"]),
    });

    const { title, amount, type } = createTransactionBodySchema.parse(
      request.body
    );

    let sessionId = request.cookies.sessionId;

    if (!sessionId) {
      sessionId = crypto.randomUUID();

      reply.setCookie("sessionId", sessionId, {
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });
    }

    await knex("transactions").insert({
      id: crypto.randomUUID(),
      title,
      amount: type === "credit" ? amount : amount * -1,
      session_id: sessionId,
    });

    return reply.status(201).send();
  });
}
