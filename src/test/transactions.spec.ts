import { it, expect, beforeAll, afterAll, describe, beforeEach } from "vitest";
import { app } from "../app";
import request from "supertest";
import { execSync } from "node:child_process";

describe("Transactions routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    execSync("npm run knex migrate:rollback --all");
    execSync("npm run knex migrate:latest");
  });

  it("should be able to create a new transaction", async () => {
    const response = await request(app.server).post("/transactions").send({
      title: "Salário",
      amount: 5000,
      type: "credit",
    });

    expect(response.statusCode).toBe(201);
  });

  it("should be able to list all transactions", async () => {
    const createTransactionResponse = await request(app.server)
      .post("/transactions")
      .send({
        title: "Salário",
        amount: 5000,
        type: "credit",
      });

    const cookies = createTransactionResponse.get("Set-Cookie");

    const listTransactionsResponse = await request(app.server)
      .get("/transactions")
      .set("Cookie", cookies)
      .expect(200);

    expect(listTransactionsResponse.body.transactions).toEqual([
      expect.objectContaining({
        title: "Salário",
        amount: 5000,
      }),
    ]);
  });

  it("should be able to get a specific transaction", async () => {
    const createTransactionResponse = await request(app.server)
      .post("/transactions")
      .send({
        title: "Salário",
        amount: 5000,
        type: "credit",
      });

    const cookies = createTransactionResponse.get("Set-Cookie");

    const listTransactionsResponse = await request(app.server)
      .get("/transactions")
      .set("Cookie", cookies)
      .expect(200);

    const transactionId = listTransactionsResponse.body.transactions[0].id;

    const getTransactionResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set("Cookie", cookies)
      .expect(200);

    expect(getTransactionResponse.body.transactions).toEqual(
      expect.objectContaining({
        title: "Salário",
        amount: 5000,
      })
    );
  });

  it("should be able to get the summary", async () => {
    const createTransactionResponse = await request(app.server)
      .post("/transactions")
      .send({
        title: "Credit",
        amount: 5000,
        type: "credit",
      });

    const cookies = createTransactionResponse.get("Set-Cookie");

    await request(app.server)
      .post("/transactions")
      .set("Cookie", cookies)
      .send({
        title: "Debit",
        amount: 2000,
        type: "debit",
      });

    const summaryResponse = await request(app.server)
      .get("/transactions/summary")
      .set("Cookie", cookies)
      .expect(200);

    expect(summaryResponse.body.summary).toEqual({
      amount: 3000,
    });
  });
});
