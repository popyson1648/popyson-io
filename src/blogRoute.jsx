// Browser-only route boundary. Article bodies and the heavier blog/search UI
// are fetched only when a Blog route is opened; build-time prerendering imports
// blog.jsx directly and keeps its existing synchronous data setup.
import "./articleBody.js";

export { Article, BlogList } from "./blog.jsx";
