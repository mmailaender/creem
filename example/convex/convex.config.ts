import { defineApp } from "convex/server";
import creem from "@convex-dev/creem/convex.config";

const app = defineApp();
app.use(creem);

export default app;
