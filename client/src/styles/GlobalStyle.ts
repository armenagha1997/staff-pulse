import { createGlobalStyle } from "styled-components";
import { colors } from "@/styles/colors";

export const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
  }

  body {
    margin: 0;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    background: ${colors.background};
    color: ${colors.text};
  }

  button {
    font-family: inherit;
  }
`;
