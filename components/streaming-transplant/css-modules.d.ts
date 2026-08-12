/** CSS Modules are typed as an open string map — Vite handles the hashing. */
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
