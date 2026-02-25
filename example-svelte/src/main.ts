import { mount } from "svelte";
import App from "./App.svelte";
import PricingPage from "./pages/PricingPage.svelte";
import "./app.css";

const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
const RootComponent = pathname === "/pricing" ? PricingPage : App;

const app = mount(RootComponent, {
  target: document.getElementById("app")!,
});

export default app;
