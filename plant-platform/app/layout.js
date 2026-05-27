import "./globals.css";

export const metadata = {
  title: "Code Pub",
  description: "Multi-plant dashboard and ingestion API for workshop moisture sensors."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


