/** @type {import('next').NextConfig} */

if(!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error(
        "NEXT_PUBLIC_API_URL  is not set." +
        "Pass it as Docker build-arg: --build-arg NEXT_PUBLIC_API_URL=http://... "
    );
}
const nextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        unoptimized: true,
    },
}

export default nextConfig
