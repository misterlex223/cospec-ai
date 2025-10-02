// Cloudflare Pages configuration
export default {
  // Build output directory
  build: {
    baseDirectory: "dist",
    publicPath: "/"
  },
  
  // Custom headers
  headers: {
    "/*": {
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    }
  },
  
  // Redirects
  redirects: [
    {
      source: "/docs",
      destination: "/docs/",
      statusCode: 301
    }
  ]
}
