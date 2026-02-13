// This file exists to prevent build errors if the bundler resolves ./App to src/App.tsx
// We re-export the actual App component from the root directory.
import App from '../App';
export default App;
