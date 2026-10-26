import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";

vi.mock("../src/modules/invitations/invitations.service.js", () => ({
  sendLobbyInvitation: vi.fn(),
  getIncomingInvitations: vi.fn(),
  respondToLobbyInvitation: vi.fn(),
}));

import { invitationsRouter } from "../src/modules/invitations/invitations.routes.js";
import {
  sendLobbyInvitation,
  getIncomingInvitations,
  respondToLobbyInvitation,
} from "../src/modules/invitations/invitations.service.js";

const testApp = express();

testApp.use(express.json());

testApp.use(
  session({
    secret: "invitation-test-secret",
    resave: false,
    saveUninitialized: false,
  })
);

testApp.use("/test/login", (req, res) => {
  req.session.userId = 42;
  res.status(200).json({ success: true });
});

testApp.use("/api/invitations", invitationsRouter);

const invitation = {
  invitationId: 1,
  lobbyId: 10,
  senderId: 42,
  recipientId: 7,
  status: "pending" as const,
};

describe("Lobby Invitations API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("requires authentication to send invitations", async () => {
    const response = await request(testApp)
      .post("/api/invitations")
      .send({ recipientId: 7, lobbyId: 10 });

    expect(response.status).toBe(401);
    expect(sendLobbyInvitation).not.toHaveBeenCalled();
  });

  it("sends an invitation to a friend", async () => {
    vi.mocked(sendLobbyInvitation).mockResolvedValue(
      invitation as Awaited<ReturnType<typeof sendLobbyInvitation>>
    );

    const agent = request.agent(testApp);
    await agent.post("/test/login");

    const response = await agent
      .post("/api/invitations")
      .send({ recipientId: 7, lobbyId: 10 });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("pending");
    expect(sendLobbyInvitation).toHaveBeenCalledWith(42, 7, 10);
  });

  it("rejects invalid invitation data", async () => {
    const agent = request.agent(testApp);
    await agent.post("/test/login");

    const response = await agent
      .post("/api/invitations")
      .send({ recipientId: -1, lobbyId: 10 });

    expect(response.status).toBe(400);
    expect(sendLobbyInvitation).not.toHaveBeenCalled();
  });

  it("rejects duplicate invitations", async () => {
    vi.mocked(sendLobbyInvitation).mockRejectedValue(
      new Error("This friend already has a pending invitation.")
    );

    const agent = request.agent(testApp);
    await agent.post("/test/login");

    const response = await agent
      .post("/api/invitations")
      .send({ recipientId: 7, lobbyId: 10 });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("pending invitation");
  });

  it("retrieves incoming invitations", async () => {
    vi.mocked(getIncomingInvitations).mockResolvedValue(
      [invitation] as Awaited<ReturnType<typeof getIncomingInvitations>>
    );

    const agent = request.agent(testApp);
    await agent.post("/test/login");

    const response = await agent.get("/api/invitations");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(getIncomingInvitations).toHaveBeenCalledWith(42);
  });

  it("accepts an invitation", async () => {
    vi.mocked(respondToLobbyInvitation).mockResolvedValue({
      ...invitation,
      status: "accepted",
    } as Awaited<ReturnType<typeof respondToLobbyInvitation>>);

    const agent = request.agent(testApp);
    await agent.post("/test/login");

    const response = await agent
      .patch("/api/invitations/1")
      .send({ action: "accept" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("accepted");
    expect(respondToLobbyInvitation).toHaveBeenCalledWith(
      42,
      1,
      "accept"
    );
  });

  it("declines an invitation", async () => {
    vi.mocked(respondToLobbyInvitation).mockResolvedValue({
      ...invitation,
      status: "declined",
    } as Awaited<ReturnType<typeof respondToLobbyInvitation>>);

    const agent = request.agent(testApp);
    await agent.post("/test/login");

    const response = await agent
      .patch("/api/invitations/1")
      .send({ action: "decline" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("declined");
    expect(respondToLobbyInvitation).toHaveBeenCalledWith(
      42,
      1,
      "decline"
    );
  });

  it("rejects invalid invitation actions", async () => {
    const agent = request.agent(testApp);
    await agent.post("/test/login");

    const response = await agent
      .patch("/api/invitations/1")
      .send({ action: "delete" });

    expect(response.status).toBe(400);
    expect(respondToLobbyInvitation).not.toHaveBeenCalled();
  });
});