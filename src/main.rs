use std::collections::BTreeSet;

use base64::{encode, decode};
use gloo_dialogs::confirm;
use indexmap::IndexMap;
use postcard::{to_allocvec, from_bytes};
use rand::{thread_rng, prelude::SliceRandom};
use uuid::Uuid;
use web_sys::{HtmlInputElement, HtmlTextAreaElement};
use yew::prelude::*;
use yewdux::prelude::*;
use serde::{Serialize,Deserialize};

const PAGE_COPY: &str = include_str!("page-copy.txt");

#[derive(Copy, Clone, PartialEq, Store)]
pub enum State {
    Landing,
    Quickplay,
    Export,
    ImportLegacy,
}
impl Default for State {
    fn default() -> Self {
        State::Landing
    }
}


fn main() {
    yew::Renderer::<App>::new().render();
}

#[function_component]
fn App() -> Html {
    let state = use_store_value::<State>();

    match &*state {
        State::Landing => {
            html! {
                <Landing />
            }
        },
        State::Export => {
            html! {
                <Export />
            }
        }
        State::Quickplay => {
            html! {
                <Quickplay />
            }
        }
        State::ImportLegacy => {
            html! {
                <ImportLegacy />
            }
        }
    }
}

#[function_component]
fn Landing() -> Html {
    let state_dispatch = Dispatch::<State>::default();
    html! {
        <>
            <h1>{"Welcome to The Bar"}</h1>
            <p class="font-lg">{PAGE_COPY}</p>
            <button class="primary" onclick={state_dispatch.set_callback(|_| State::Quickplay)}>
                {"Quick Play (Offline)"}
            </button>
            <button onclick={state_dispatch.set_callback(|_| State::Export)}>
                {"Transfer Characters"}
            </button>
            <button onclick={state_dispatch.set_callback(|_| State::ImportLegacy)}>
                {"Import Legacy Characters"}
            </button>
        </>
    }

}

#[function_component]
fn Export() -> Html {
    let state_dispatch = Dispatch::<State>::default();
    let (characters, characters_dispatch) = use_store::<QuickplayCharacters>();

    let import_state = use_state(|| None::<QuickplayCharacters>);
    let import_nref = use_node_ref();

    let character_data_raw = to_allocvec(&*characters).unwrap();
    let character_data_str = encode(&character_data_raw);
    
    let onchange = {
        let import_state = import_state.clone();
        let import_nref = import_nref.clone();
        Callback::from(move |_: Event| {
            let new_input = import_nref.cast::<HtmlInputElement>().unwrap().value();
            import_state.set(try_decode(&new_input));
        })
    };

    let onclick = {
        let import_state = import_state.clone();
        characters_dispatch.reduce_mut_callback(move |state| {
            let confirmed = confirm("This will delete your currently loaded characters, and replace\
                them with the pasted import, continue?");
            if confirmed {
                if let Some(import) = import_state.as_ref().cloned() {
                    state.characters = import.characters;
                }
            }
        })
    };

    html! {
        <>
            <h2>{"Export & Import Characters"}</h2>
            <p>{"Copy the following import code:"}</p>
            <div class="character-export-code">{character_data_str}</div>
            <p>{"Paste it into this box on your new device"}</p>
            <input type="text" {onchange} ref={import_nref} />
            if let Some(QuickplayCharacters { characters }) = import_state.as_ref() {

                <p>{"Importing:"}</p>
                <ul>
                {
                    characters.values().map(|ch| html! { <li>{ch}</li> }).collect::<Vec<_>>()
                }
                </ul>
            }
            <p>{"Confirm Import:"}</p>
            <button
                class="primary"
                {onclick}
                disabled={import_state.is_none()}
            >
                {"Import Characters"}
            </button>
            <p class="warning">
                {"WARNING: clicking the above button will delete any characters on this device, "}
                {"and replace them fully with the characters exported from your old device"}
            </p>
            <button onclick={state_dispatch.set_callback(|_| State::Landing)}>{"Go Back"}</button>
        </>
    }
}

fn try_decode(input: &str) -> Option<QuickplayCharacters> {
    let new_input_raw = decode(input).ok()?;
    from_bytes(&new_input_raw).ok()
}

#[derive(Default, Clone, PartialEq, Store, Serialize, Deserialize)]
pub struct QuickplayState {
    selected_character: Option<Uuid>,
    seen_characters: BTreeSet<Uuid>,
    all_seeable_characters: BTreeSet<Uuid>,
}

#[derive(Default, Clone, PartialEq, Store, Serialize, Deserialize)]
#[store(storage = "local")]
pub struct QuickplayCharacters {
    characters: IndexMap<Uuid, String>
}

#[function_component]
fn Quickplay() -> Html {
    let (characters, characters_dispatch) = use_store::<QuickplayCharacters>();
    let state_dispatch = Dispatch::<State>::default();
    let (quickplay_state, quickplay_dispatch) = use_store::<QuickplayState>();

    let onclick = {
        quickplay_dispatch.reduce_mut_callback(move |state| {
            // first, check if bag is full
            let mut available_choices = state.all_seeable_characters.difference(&state.seen_characters).cloned().collect::<Vec<_>>();
            if available_choices.is_empty() {
                state.seen_characters.clear();
                available_choices = state.all_seeable_characters.difference(&state.seen_characters).cloned().collect::<Vec<_>>();
            }
            loop {
                let candidate = available_choices
                    .choose(&mut thread_rng())
                    .cloned();
                if candidate == state.selected_character && available_choices.len() != 1 {
                    continue
                }
                state.selected_character = candidate;
                break;
            }
            if let Some(selected) = state.selected_character.as_ref().cloned() {
                state.seen_characters.insert(selected);
            }
        })
    };

    {
        let quickplay_dispatch = quickplay_dispatch.clone();
        use_effect_with_deps(move |characters| {
            let characters = characters.clone();
            quickplay_dispatch.reduce_mut(move |state| {
                state.all_seeable_characters = characters.characters.keys().cloned().collect()
            });
            ||() 
        }, characters.clone());
    }

    html! {
        <>
            <h2>{"Quickplay"}</h2>

            if let Some(selected_character) = quickplay_state.selected_character.as_ref() {
                if let Some(character) = characters.characters.get(selected_character) {
                    if !character.is_empty() {
                        <h3>
                            {"You are: "}{character}
                        </h3>
                    } else {
                        <h3 class="nowrap">
                            {"You are: Unnamed Character"}
                        </h3>
                    }
                }
            }

            <button {onclick} class="primary" disabled={characters.characters.is_empty()}>
                {"Roll Character"}
            </button>
    
            {
                characters.characters.keys().cloned().map(|character_id| {
                    html! { <CharacterEdit {character_id}/> }
                }).collect::<Vec<_>>()
            }

            <button onclick={characters_dispatch.reduce_mut_callback(|characters| characters.characters.insert(Uuid::new_v4(), "".into()))}>
                {"Add New Character"}
            </button>
            <button onclick={state_dispatch.set_callback(|_| State::Landing)}>{"Go Back"}</button>
        </>
    }
}


#[derive(Properties, PartialEq)]
struct CharacterEditProps {
    character_id: Uuid,
}
#[function_component]
fn CharacterEdit(props: &CharacterEditProps) -> Html {
    let (characters, characters_dispatch) = use_store::<QuickplayCharacters>();
    let nref = use_node_ref();
    
    let onchange = {
        let id = props.character_id.clone();
        let nref = nref.clone();
        characters_dispatch.reduce_mut_callback(move |characters| {
            let input = nref.cast::<HtmlInputElement>().unwrap();
            characters.characters.insert(id, input.value())
        })
    };

    let onclick = {
        let id = props.character_id.clone();
        characters_dispatch.reduce_mut_callback(move |characters| {
            characters.characters.remove(&id);
        })
    };
    

    html! {
        <div class="character-input">
        <input 
            type="text"
            placeholder="Enter character name"
            value={characters.characters.get(&props.character_id).unwrap().clone()}
            {onchange}
            ref={nref}
        />
        <button {onclick}>{"Remove"}</button>
        </div>
    }
}

#[function_component]
fn ImportLegacy() -> Html {
    let state_dispatch = Dispatch::<State>::default();
    let (characters, characters_dispatch) = use_store::<QuickplayCharacters>();


    let current_characters = characters.characters.values().cloned().collect::<Vec<_>>().join("\n");

    let import_state = use_state(|| None::<QuickplayCharacters>);
    let import_nref = use_node_ref();
    
    let oninput = {
        let import_state = import_state.clone();
        let import_nref = import_nref.clone();
        Callback::from(move |_: InputEvent| {
            let new_input = import_nref.cast::<HtmlInputElement>().unwrap().value();
            import_state.set(Some(QuickplayCharacters { characters: new_input.lines().map(|char| (Uuid::new_v4(), char.to_string())).collect()  }))
        })
    };

    let onclick = {
        let import_state = import_state.clone();
        characters_dispatch.reduce_mut_callback(move |state| {
            let confirmed = confirm("This will delete your currently loaded characters, and replace\
                them with the pasted import, continue?");
            if confirmed {
                if let Some(import) = import_state.as_ref().cloned() {
                    state.characters = import.characters;
                }
            }
        })
    };

    {
        let import_nref = import_nref.clone();
        use_effect_with_deps(move |_| { 
            import_nref.cast::<HtmlTextAreaElement>().unwrap().set_value(&current_characters);
            || ()
        }, ());
    }

    html! {
        <>
            <h2>{"Import From Old Bar:"}</h2>
            <p>{"Paste your old bar character list here"}</p>
            <textarea {oninput} ref={import_nref} rows="10"></textarea>
            if let Some(QuickplayCharacters { characters }) = import_state.as_ref() {
                <p>{"Importing:"}</p>
                <ul>
                {
                    characters.values().map(|ch| html! { <li>{ch}</li> }).collect::<Vec<_>>()
                }
                </ul>
            }
            <p>{"Confirm Import:"}</p>
            <button
                class="primary"
                {onclick}
                disabled={import_state.is_none()}
            >
                {"Import Characters"}
            </button>
            <p class="warning">
                {"WARNING: clicking the above button will delete any characters on this device, "}
                {"and replace them fully with the characters exported from your old device"}
            </p>
            <button onclick={state_dispatch.set_callback(|_| State::Landing)}>{"Go Back"}</button>
        </>
    }
}