import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config", () => ({
  env: {
    DATABASE_URL: "postgres://test",
    JWT_SECRET: "test-secret-test-secret-test-secret",
    JWT_REFRESH_SECRET: "refresh-secret-refresh-secret-refresh",
  },
}));

import { LOGIN_ERROR_MESSAGES } from "@/constants/login.constants";

vi.mock("@/db", () => ({
  db: {
    transaction: vi.fn(),
    query: {},
  },
}));

vi.mock("@/lib/send-email", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/send-whatsapp", () => ({
  default: vi.fn(),
}));

const mockFindTeamMemberByNextcloudIdentity = vi.fn();
const mockIsAdminPanelTeamMember = vi.fn();
const mockFindByEmail = vi.fn();
const mockFindByPhoneNumber = vi.fn();
const mockAuthenticateNextcloudAppPassword = vi.fn();

vi.mock("@/modules/users/users.repository", () => ({
  UserRepository: class MockUserRepository {
    findTeamMemberByNextcloudIdentity = mockFindTeamMemberByNextcloudIdentity;

    isAdminPanelTeamMember = mockIsAdminPanelTeamMember;

    findByEmail = mockFindByEmail;

    findByPhoneNumber = mockFindByPhoneNumber;
  },
}));

vi.mock("@/modules/addresses/addresses.service", () => ({
  AddressService: class MockAddressService {},
}));

vi.mock("@/lib/nextcloud-auth", () => ({
  isNextcloudAuthEnabled: vi.fn(() => true),
  authenticateNextcloudAppPassword: (...args: unknown[]) =>
    mockAuthenticateNextcloudAppPassword(...args),
}));

vi.mock("@/core/middlewares/jwt", () => ({
  signJwtToken: vi.fn(async () => "access-token"),
  signRefreshToken: vi.fn(async () => "refresh-token"),
}));

vi.mock("argon2", () => ({
  verify: vi.fn(async () => true),
  hash: vi.fn(async (value: string) => value),
}));

import { UsersService } from "@/modules/users/users.service";

describe("UsersService.login admin panel membership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks admin panel membership before validating Nextcloud credentials", async () => {
    mockFindTeamMemberByNextcloudIdentity.mockResolvedValue(null);

    const service = new UsersService();

    await expect(
      service.login({
        username: "madam@example.com",
        password: "abcdefghijklmnopqrstuvwxyz1234567890",
      }),
    ).rejects.toMatchObject({
      message: LOGIN_ERROR_MESSAGES.NOT_ADMIN_PANEL_MEMBER,
    });

    expect(mockFindTeamMemberByNextcloudIdentity).toHaveBeenCalledWith({
      loginIdentifier: "madam@example.com",
    });
    expect(mockAuthenticateNextcloudAppPassword).not.toHaveBeenCalled();
  });

  it("validates Nextcloud credentials only after membership is confirmed", async () => {
    mockFindTeamMemberByNextcloudIdentity
      .mockResolvedValueOnce({
        id: 7,
        username: "team.member",
        isAdmin: false,
        employee: { id: 1, isDeleted: false },
      })
      .mockResolvedValueOnce({
        id: 7,
        username: "team.member",
        isAdmin: false,
        employee: { id: 1, isDeleted: false },
      });
    mockAuthenticateNextcloudAppPassword.mockResolvedValue({
      id: "team.member",
      email: "team.member@edoshop.online",
      displayName: "Team Member",
    });

    const service = new UsersService();
    const result = await service.login({
      username: "team.member@edoshop.online",
      password: "abcdefghijklmnopqrstuvwxyz1234567890",
    });

    expect(mockAuthenticateNextcloudAppPassword).toHaveBeenCalledWith(
      "team.member@edoshop.online",
      "abcdefghijklmnopqrstuvwxyz1234567890",
    );
    expect(result.accessToken).toBe("access-token");
    expect(result.user.id).toBe(7);
  });

  it("rejects local email login when the account is not an admin panel member", async () => {
    mockFindByEmail.mockResolvedValue({
      id: 3,
      username: "customer",
      password: "hashed-password",
    });
    mockIsAdminPanelTeamMember.mockResolvedValue(false);

    const service = new UsersService();

    await expect(
      service.login({
        email: "customer@example.com",
        password: "Abcd1234!",
      }),
    ).rejects.toMatchObject({
      message: LOGIN_ERROR_MESSAGES.NOT_ADMIN_PANEL_MEMBER,
    });

    expect(mockIsAdminPanelTeamMember).toHaveBeenCalledWith(3);
  });

  it("allows phone login for storefront customers without admin panel membership", async () => {
    mockFindByPhoneNumber.mockResolvedValue({
      id: 9,
      username: "customer-9",
      password: "hashed-password",
    });

    const service = new UsersService();
    const result = await service.login({
      phoneNumber: "+237600000000",
      password: "Abcd1234!",
    });

    expect(mockIsAdminPanelTeamMember).not.toHaveBeenCalled();
    expect(result.accessToken).toBe("access-token");
    expect(result.user.id).toBe(9);
  });

  it("returns generic phone invalid error when account has no local password", async () => {
    mockFindByPhoneNumber.mockResolvedValue({
      id: 11,
      username: "team-member",
      password: null,
    });

    const service = new UsersService();

    await expect(
      service.login({
        phoneNumber: "+923162266713",
        password: "Abcd1234!",
      }),
    ).rejects.toMatchObject({
      message: LOGIN_ERROR_MESSAGES.PHONE_INVALID,
    });
  });
});
