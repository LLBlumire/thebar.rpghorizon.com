import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1 className="font-bold">{"Welcome to The Bar"}</h1>
      <p className="font-lg">
        Welcome traveller, this is a magical place. Forget about your troubles.
        Sit, drink, and talk with those who join you. This is a dream, one you
        will forget when you awake. Understand the other patrons here are not of
        your world, though they may be from one like it. You may leave at any
        time.
      </p>
      <Link className="primary button" href="/play">
        {"Quick Play (Offline)"}
      </Link>
      <button className="button">{"Transfer Characters"}</button>
      <button className="button">{"Import Legacy Characters"}</button>
    </>
  );
}
