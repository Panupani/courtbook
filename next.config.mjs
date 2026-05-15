/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Disable the client-side Router Cache for dynamic pages so navigating
    // to the booking page always fetches fresh SSR data from the server.
    staleTimes: { dynamic: 0 },
  },
}

export default nextConfig
