"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const localStorageKey = "frontend::QuickplayCharacters";

export default function Page() {
  const [selectedCharacter, setSelectedCharacter] = useState<string>();
  const [charactersLoaded, setCharactersLoaded] = useState<boolean>(false);
  const [seenCharacters, setSeenCharacters] = useState<Set<string>>(new Set());
  const [characters, setCharacters] = useState(new Map<string, string>());
  const seeableCharacters = new Set(characters.keys());

  const selectedCharacterRawName = selectedCharacter
    ? characters.get(selectedCharacter)
    : undefined;
  const selectedCharacterName =
    selectedCharacterRawName === undefined
      ? undefined
      : selectedCharacterRawName === ""
      ? "Unnamed Character"
      : selectedCharacterRawName;

  useEffect(() => {
    const data = JSON.parse(
      window.localStorage.getItem(localStorageKey) ?? "{characters:[]}"
    );
    setCharacters(new Map(Object.entries(data["characters"] ?? {})));
    setCharactersLoaded(true);
  }, []);

  useEffect(() => {
    if (charactersLoaded) {
      window.localStorage.setItem(
        localStorageKey,
        JSON.stringify({ characters: Object.fromEntries(characters.entries()) })
      );
    }
  }, [characters, charactersLoaded]);

  console.log(seeableCharacters);

  return (
    <>
      <h2 className="font-bold">{"Quickplay"}</h2>
      {selectedCharacterName ? (
        <h3 className="font-bold">You are: {selectedCharacterName}</h3>
      ) : (
        <></>
      )}
      <button
        className="primary button"
        disabled={characters.size === 0}
        onClick={() => {
          let availableChoices = new Set(
            [...seeableCharacters].filter((x) => !seenCharacters.has(x))
          );
          if (availableChoices.size === 0) {
            setSeenCharacters(new Set());
            availableChoices = seeableCharacters;
          }
          while (true) {
            let candidate =
              Array.from(availableChoices)[
                Math.floor(Math.random() * availableChoices.size)
              ];
            if (
              candidate === selectedCharacter &&
              availableChoices.size !== 1
            ) {
              continue;
            }
            setSelectedCharacter(candidate);
            break;
          }
          if (selectedCharacter) {
            const newSeenCharacters = new Set(seenCharacters);
            newSeenCharacters.add(selectedCharacter);
            setSeenCharacters(newSeenCharacters);
          }
        }}
      >
        {"Roll Character"}
      </button>
      {Array.from(characters).map(([characterId, character]) => {
        return (
          <div className="character-input" key={characterId}>
            <input
              type="text"
              placeholder="Enter character name"
              value={character}
              onChange={(change) => {
                const newCharacters = new Map(characters);
                newCharacters.set(characterId, change.target.value);
                setCharacters(newCharacters);
              }}
            />
            <button
              className="button"
              onClick={() => {
                const newCharacters = new Map(characters);
                newCharacters.delete(characterId);
                setCharacters(newCharacters);
              }}
            >
              {"Remove"}
            </button>
          </div>
        );
      })}
      <button
        className="button"
        onClick={() => {
          const newCharacters = new Map(characters);
          newCharacters.set(crypto.randomUUID(), "");
          setCharacters(newCharacters);
        }}
      >
        Add New Character
      </button>
      <Link href="/" className="button">
        Go Back
      </Link>
    </>
  );
}
