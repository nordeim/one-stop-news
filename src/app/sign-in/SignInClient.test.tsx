import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SignInClient } from "./SignInClient";

describe("SignInClient", () => {
  it("renders the page heading", () => {
    render(<SignInClient showGoogle={false} showGithub={false} />);
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeDefined();
  });

  it("renders the credentials form with email and password fields", () => {
    render(<SignInClient showGoogle={false} showGithub={false} />);
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/password/i)).toBeDefined();
  });

  it("renders a submit button for credentials form", () => {
    render(<SignInClient showGoogle={false} showGithub={false} />);
    expect(
      screen.getByRole("button", { name: /sign in with credentials/i }),
    ).toBeDefined();
  });

  it("does NOT render Google button when showGoogle is false", () => {
    render(<SignInClient showGoogle={false} showGithub={false} />);
    expect(
      screen.queryByRole("button", { name: /sign in with google/i }),
    ).toBeNull();
  });

  it("renders Google button when showGoogle is true", () => {
    render(<SignInClient showGoogle={true} showGithub={false} />);
    expect(
      screen.getByRole("button", { name: /sign in with google/i }),
    ).toBeDefined();
  });

  it("does NOT render GitHub button when showGithub is false", () => {
    render(<SignInClient showGoogle={false} showGithub={false} />);
    expect(
      screen.queryByRole("button", { name: /sign in with github/i }),
    ).toBeNull();
  });

  it("renders GitHub button when showGithub is true", () => {
    render(<SignInClient showGoogle={false} showGithub={true} />);
    expect(
      screen.getByRole("button", { name: /sign in with github/i }),
    ).toBeDefined();
  });

  it("renders all three sign-in options when both OAuth providers are enabled", () => {
    render(<SignInClient showGoogle={true} showGithub={true} />);
    expect(
      screen.getByRole("button", { name: /sign in with google/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /sign in with github/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /sign in with credentials/i }),
    ).toBeDefined();
  });

  it("renders a link back to home", () => {
    render(<SignInClient showGoogle={false} showGithub={false} />);
    const homeLink = screen.getByRole("link", { name: /back to home/i });
    expect(homeLink).toBeDefined();
    expect(homeLink.getAttribute("href")).toBe("/");
  });

  it("renders a <main> element with id='main-content' as the skip-link target", () => {
    // The skip-to-content link in layout.tsx targets #main-content.
    // Every page template must render <main id="main-content"> for the
    // skip link to have a valid target on that page.
    const { container } = render(
      <SignInClient showGoogle={false} showGithub={false} />,
    );
    const main = container.querySelector("main#main-content");
    expect(main).not.toBeNull();
  });
});
