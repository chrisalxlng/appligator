export type Message =
  | { type: "login" }
  | { type: "logout" }
  | { type: "importJob"; tabId: number; link: string };

export function sendMessage(message: Message) {
  void chrome.runtime.sendMessage(message);
}
