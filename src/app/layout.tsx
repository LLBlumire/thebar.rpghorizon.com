import "~/styles/globals.css";

export const metadata = {
  title: "The Bar",
  description:
    "Welcome traveller, this is a magical place. Sit, drink, and talk with those who join you.",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
