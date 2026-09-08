import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Fija la raíz en esta carpeta. Sin esto, Turbopack encuentra un
  // package-lock.json suelto en C:\Users\brimo y toma la carpeta de
  // usuario como raíz del proyecto.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
