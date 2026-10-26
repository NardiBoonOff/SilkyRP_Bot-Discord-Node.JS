import { Listener, ListenerOptions } from "@sapphire/framework";
import Logger from "../lib/Logger";
class ReadyListener extends Listener {
  constructor(
    context: Listener.LoaderContext,
    options: ListenerOptions | undefined
  ) {
    super(context, { ...options, once: true, event: "ready" });
  }
  public run(...args: unknown[]): void {
    Logger.info(`Connecté en tant que ${this.container.client.user?.tag}`);
  }
}

export default ReadyListener;
