import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wiki Generator",
  description: "Generate comprehensive documentation for any GitHub repository",
};

export default function RootLayout({children}: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en">
      <body>
        <main style={{padding: 16}}>{children}</main>
      </body>
    </html>
  );
}
