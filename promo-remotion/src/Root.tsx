import "./index.css";
import { Composition } from "remotion";
import { JoyfulPosPromo } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="JoyfulPosPromo"
        component={JoyfulPosPromo}
        durationInFrames={720}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
