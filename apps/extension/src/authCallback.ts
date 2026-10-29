import { sendMessage } from "./messages.ts";

sendMessage({ type: "completeLogin", url: location.href });
