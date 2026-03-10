import { StatCards, SlidesGallery, LegendCards, PrecipitationCards, IrrigationCards, SnowCoverCards, DamCards } from '../Charts';
import { useMapStore } from '../../store/mapStore';
import './MediaPanel.css';

const RightPanel = () => {
  const { layerVisibility } = useMapStore();
  const showBasins = layerVisibility.riverBasins;
  const showPrecip = layerVisibility.precipitation;
  const showIrrigation = layerVisibility.mainCanals || layerVisibility.branchCanals || layerVisibility.distributaryCanals;
  const showSnowCover = layerVisibility.snowCover;
  const showDams = layerVisibility.headworks || layerVisibility.ongoingDams || layerVisibility.underConstruction || layerVisibility.futureDams || layerVisibility.indianDams;

  const renderCards = () => {
    if (showBasins) return <LegendCards />;
    if (showSnowCover) return <SnowCoverCards />;
    if (showPrecip) return <PrecipitationCards />;
    if (showIrrigation) return <IrrigationCards />;
    if (showDams) return <DamCards />;
    return <StatCards />;
  };

  return (
    <div className="media-panel">
      {renderCards()}

      <div className="media-panel-main">
        <SlidesGallery />
      </div>
    </div>
  );
};

export default RightPanel;
