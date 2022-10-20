import React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Calendar from "./features/calendar/calendar";

const queryClient = new QueryClient();

function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <Calendar></Calendar>
      </div>
    </QueryClientProvider>
  );
}

export default App;
