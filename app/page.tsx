import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameReducer,
  NextServerPageProps,
  getFrameMessage,
  getPreviousFrame,
  useFramesReducer,
} from "frames.js/next/server";
import Link from "next/link";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DEFAULT_DEBUGGER_HUB_URL, createDebugUrl } from "./debug";
import { currentURL } from "./utils";

const genAI = new GoogleGenerativeAI(process.env.API_KEY as string);

async function makeAIRrequest(likedSongs: string[]) {
  if (likedSongs.length === 0) return;

  const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro"});
  const prompt = `Suggest me a song based on these songs: ${likedSongs.join(", ")}. I would like you to return search url of the song you suggested and what kind of music it mainly contains, link shouldn't be broken. Genre should be one of these: pop, rock or rap. The format I want you to return is as follows: '{ "link": "<youtube_link>", "genre": "<genre>" }'`

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  console.log("TEXTTTT", text)
  return JSON.parse(text);
}

type State = {
  activePage: string;
  likedSongs: string[];
};

const initialState = { activePage: "pop", likedSongs: [] };

const reducer: FrameReducer<State> = (state, action) => {
  return {
    activePage: state.activePage === "pop" ? "rock" : state.activePage === "rock" ? "rap" : state.activePage === "rap" ? "result" : "result",
    likedSongs: action.postBody?.untrustedData.buttonIndex === 1 ? [...state.likedSongs, musics.filter((el) => el.genre === state.activePage)[0].name] : state.likedSongs,
  };
};

const musics = [
  {
    genre: "rock",
    name: "Believer - Imagine Dragons",
    link: "https://i.ytimg.com/vi/9qcpgjdsCxc/maxresdefault.jpg"
  },
  {
    genre: "pop",
    name: "Houdini - Dua Lipa",
    link: "https://image-cdn.hypb.st/https%3A%2F%2Fhypebeast.com%2Fimage%2F2023%2F11%2Fdua-lipa-houdini-new-single-release-000.jpg?w=960&cbr=1&q=90&fit=max"
  },
  {
    genre: "rap",
    name: "Mockingbird - Eminem",
    link: "https://i.ytimg.com/vi/y9-wRGRbJyw/maxresdefault.jpg"
  }
]

// This is a react server component only
export default async function Home({ searchParams }: NextServerPageProps) {
  let suggestedSong = null;

  const url = currentURL("/");
  const previousFrame = getPreviousFrame<State>(searchParams);

  const frameMessage = await getFrameMessage(previousFrame.postBody, {
    hubHttpUrl: DEFAULT_DEBUGGER_HUB_URL,
  });

  if (frameMessage && !frameMessage?.isValid) {
    throw new Error("Invalid frame payload");
  }

  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame
  );

  if (state.activePage === "result") {
    suggestedSong = await makeAIRrequest(state.likedSongs);
  }

  // Here: do a server side side effect either sync or async (using await), such as minting an NFT if you want.
  // example: load the users credentials & check they have an NFT

  console.log("info: state is:", state);

  // then, when done, return next frame
  
  return (
    <div className="p-4">
      frames.js starter kit. The Template Frame is on this page, it&apos;s in
      the html meta tags (inspect source).{" "}
      <Link href={createDebugUrl(url)} className="underline">
        Debug
      </Link>{" "}
      or see{" "}
      <Link href="/examples" className="underline">
        other examples
      </Link>
      {
        state.activePage === "result" ? <FrameContainer
        postUrl="/frames"
        pathname="/result"
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage src={suggestionImage(suggestedSong.genre)} />
        <FrameButton action="link" target={suggestedSong && suggestedSong.link}>
          Go to playlist! 
        </FrameButton>
      </FrameContainer> : <FrameContainer
        postUrl="/frames"
        pathname="/"
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage src={musics.filter((el) => el.genre === state.activePage)[0].link} />
        <FrameButton>
         Love it! &#10084;
        </FrameButton>
        <FrameButton action="link" target={`https://www.youtube.com/watch?v=7wtfhZwyrcc`}>
          Music Link
        </FrameButton> 
        <FrameButton>
         Naahh! &#128078;
        </FrameButton>
      </FrameContainer>
      }
    </div>
  );
}

function suggestionImage(genre: string) {
  switch (genre) {
    case "pop":
      return "https://cdn4.vectorstock.com/i/1000x1000/77/28/i-love-pop-music-background-vector-1467728.jpg";
    case "rock":
      return "https://cdn1.vectorstock.com/i/1000x1000/23/85/i-love-rock-neon-text-music-sign-vector-21852385.jpg";
    case "rap":
      return "https://i.ytimg.com/vi/-AnsnX6dtGs/sddefault.jpg";  
    default:
      return "";
  }
}