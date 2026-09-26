// React's profiling build of react-dom, which @types/react-dom does not
// declare: the same functions as react-dom/client.
declare module "react-dom/profiling" {
  export { createRoot, hydrateRoot } from "react-dom/client";
}
