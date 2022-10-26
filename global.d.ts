declare global {
  interface Window {
    myAPI: Sandbox;
  }
}

export interface Sandbox {
  openByButton: () => Promise<string | void | undefined>;
}
