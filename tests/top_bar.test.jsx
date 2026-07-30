import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { AppCtx, TopBar } from "../src/components.jsx";

const t = {
  nav: { about: "About", blog: "Blog", app: "Works", reading: "Reading" },
  tools: "Tools",
  lang: "EN",
  lang_toggle: "Switch language",
  language: "Language",
  theme_light: "Light",
  theme_dark: "Dark",
  theme_system: "System",
  theme: "Theme",
};

beforeEach(() => {
  window.BlogData = {
    POSTS: [
      {
        id: "design",
        tags: {
          ja: ["ソフトウェア設計", "TypeScript"],
          en: ["software design", "TypeScript"],
        },
      },
    ],
  };
});

describe("TopBar language switch", () => {
  test("translates an active Blog tag before navigating", async () => {
    const nav = vi.fn();
    render(
      <AppCtx.Provider
        value={{
          t,
          lang: "ja",
          theme: "system",
          setTheme: vi.fn(),
          route: { name: "blog", tag: "ソフトウェア設計" },
          nav,
        }}
      >
        <TopBar />
      </AppCtx.Provider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Switch language" }));
    expect(nav).toHaveBeenCalledWith("/blog?tag=software%20design", "en");
  });
});
