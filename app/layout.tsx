import "./globals.css";

export const metadata = {
  title: "Brucia Moi",
  description: "Brucia Moi Ticketing"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
