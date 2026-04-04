import { Composition, registerRoot } from "remotion";
import { SiteSyncVideo } from "./Video";
import { FPS, W, H } from "./components/tokens";

const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="SiteSyncMarketingVideo"
      component={SiteSyncVideo}
      durationInFrames={2220}
      fps={FPS}
      width={W}
      height={H}
    />
    {/* 60-second social cut */}
    <Composition
      id="SiteSyncSocialCut"
      component={SiteSyncVideo}
      durationInFrames={1800}
      fps={FPS}
      width={1080}
      height={1080}
    />
  </>
);

registerRoot(RemotionRoot);
