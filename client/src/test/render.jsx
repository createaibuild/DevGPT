import { ThemeProvider } from "@mui/material/styles";
import { render } from "@testing-library/react";
import { buildTheme } from "../theme";

export function renderWithTheme(ui, mode = "dark") {
  return render(<ThemeProvider theme={buildTheme(mode)}>{ui}</ThemeProvider>);
}
