import { HttpError } from "../../errors/http-error";
import { moderatePostContent } from "../../services/post-moderation.service";
import { assertPostLinksAreSafe } from "../../utils/post-link-security.util";

describe("post abuse controls", () => {
  beforeAll(() => {
    process.env.POST_CONTENT_MODERATION_ENABLED = "true";
  });

  it("blocks configured profanity or unsafe content", () => {
    expect(() => moderatePostContent("hello", "this contains porn content")).toThrow(
      HttpError
    );
  });

  it("blocks unsafe localhost or private-network links", () => {
    expect(() =>
      assertPostLinksAreSafe("Test", "visit http://127.0.0.1:3000/admin")
    ).toThrow(HttpError);
  });

  it("allows normal public https links", () => {
    expect(() =>
      assertPostLinksAreSafe("Test", "visit https://example.com/path")
    ).not.toThrow();
  });
});
