"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const localStorageKey = "frontend::QuickplayCharacters";

export default function Page() {
  const [characters, setCharacters] = useState(new Map<string, string>());
  const [charactersLoaded, setCharactersLoaded] = useState<boolean>(false);
  useEffect(() => {
    const data = JSON.parse(
      window.localStorage.getItem(localStorageKey) ?? '{"characters":[]}'
    );
    setCharacters(new Map(Object.entries(data["characters"] ?? {})));
    setCharactersLoaded(true);
  }, []);

  const defaultTextArea = Array.from(characters.values()).join("\n");

  return (
    <>
      <h2>{"Import From Old Bar:"}</h2>
      <p>{"Paste your old bar character list here"}</p>
      <textarea
        rows={10}
        value={defaultTextArea}
        onChange={(e) => {
          const inputCharacters = e.target.value.split("\n");
          const nextCharacters = new Map(
            inputCharacters.map((character) => [crypto.randomUUID(), character])
          );
          setCharacters(nextCharacters);
        }}
      ></textarea>
      <p>Importing:</p>
      <ul>
        {Array.from(characters.entries()).map(
          ([characterId, characterName]) => (
            <li key={characterId}>{characterName}</li>
          )
        )}
      </ul>
      <p>Confirm Import:</p>
      <button
        className="button primary"
        onClick={() => {
          confirm(
            "This will delete your currently loaded characters, and replace them with the pasted import, continue?"
          );
          window.localStorage.setItem(
            localStorageKey,
            JSON.stringify({
              characters: Object.fromEntries(characters.entries()),
            })
          );
        }}
      >
        Import Characters
      </button>
      <p className="warning">
        WARNING: clicking the above button will delete any characters on this
        device, and replace them fully with the characters exported from your
        old device
      </p>
      <Link href="/" className="button">
        Go Back
      </Link>
    </>
  );
}
