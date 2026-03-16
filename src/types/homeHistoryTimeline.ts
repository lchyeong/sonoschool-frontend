export interface HomeHistoryTimelineItem {
  year: string;
  title: string;
  description: string;
}

export interface HomeHistoryTimelineResponse {
  items: HomeHistoryTimelineItem[];
}
