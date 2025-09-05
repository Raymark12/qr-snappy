import '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    approve?: PaletteColor
    reject?: PaletteColor
  }

  interface PaletteOptions {
    approve?: PaletteColorOptions
    reject?: PaletteColorOptions
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    approve: true
    reject: true
  }
}

