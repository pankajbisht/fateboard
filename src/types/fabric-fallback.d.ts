// Temporary fallback to treat fabric as `any` to allow build while
// we iteratively improve typings. Remove this when fabric typings are
// fully restored.
declare module 'fabric' {
  const fabric: any;
  export = fabric;
}

declare module 'fabric/**' {
  const anyExport: any;
  export default anyExport;
}
