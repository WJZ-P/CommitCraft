import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    /* config options here */
    //serverExternalPackages : ["minecraft-data"]

    compiler: {
        //  生产环境下删除log
        removeConsole: process.env.NODE_ENV === "production" ? {exclude: ["error", "warn"]} : false,
    }
};

export default nextConfig;
