import { forecastCinemaProject } from './boxOfficeForecastAdapter';
self.onmessage=({data})=>{try {self.postMessage({forecast:forecastCinemaProject(data.player,data.project,data.titleId,data.releaseWeek)})}
catch(error){self.postMessage({error:error instanceof Error?error.message:'Forecast unavailable'})}};
