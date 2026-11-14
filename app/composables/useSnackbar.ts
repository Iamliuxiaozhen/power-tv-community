interface SnackbarState {
  id: number
  message: string
}

export function useSnackbar() {
  const snackbar = useState<SnackbarState | null>('snackbar', () => null)

  function showSnackbar(message: string) {
    snackbar.value = { id: Date.now(), message }
  }

  function dismissSnackbar() {
    snackbar.value = null
  }

  return { snackbar, showSnackbar, dismissSnackbar }
}
