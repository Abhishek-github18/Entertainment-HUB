import {
  Button,
  createMuiTheme,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
} from "@material-ui/core";
import "./Search.css";
import SearchIcon from "@material-ui/icons/Search";
import { useEffect, useState } from "react";
import axios from "axios";
import CustomPagination from "../../components/Pagination/CustomPagination";
import SingleContent from "../../components/SingleContent/SingleContent";
import { GoogleGenerativeAI } from "@google/generative-ai";

const Search = () => {
  const [type, setType] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [content, setContent] = useState([]);
  const [numOfPages, setNumOfPages] = useState();
  const [movieRecommendataion, setMovieRecommendation] = useState([]);

  const darkTheme = createMuiTheme({
    palette: {
      type: "dark",
      primary: {
        main: "#fff",
      },
    },
  });

  const fetchSearch = async () => {
    try {
      if(searchText === "") return;

      if(type === 2) {
        handleRecommendations();
        return;
      }
      const { data } = await axios.get(
        `https://api.themoviedb.org/3/search/${type ? "tv" : "movie"}?api_key=${
          process.env.REACT_APP_API_KEY
        }&language=en-US&query=${searchText}&page=${page}&include_adult=false`
      );
      setContent(data.results);
      setNumOfPages(data.total_pages);
      // console.log(data);
      // fetchMovieRecommendation();
    } catch (error) {
      console.error(error);
    }
  };

  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const handleRecommendations = async () => {
    try {
      const prompt = `Provide a list of movies or web series based on the following: "${searchText}". Return the result as an array. Provide only ten recommendations. Remember to provide the response in the form of an array and nothing else. If you cannot find anything, return an empty array.`;
  
//       const prompt = `Provide a list of movies or web series based on the following: "${searchText}". Return the result as an array. Provide only ten recommendations. Remember to provide the response in the form of an array and nothing else. If you cannot find anything, return an empty array. using this JSON schema:

// Movies = {'MovieName': string}
// Return: Array<Recipe>`;

      const result = await model.generateContent(prompt);
      console.log(result.response.text());
      const movieRecommendationsText = result.response.text(); // Get the response text as a string

      const cleanedText = movieRecommendationsText.replace(/```json|```/g, '').trim(); // Remove backticks and JSON markers
    
    // Parse the cleaned text into a JavaScript array
    let movieRecommendations;
    try {
      movieRecommendations = JSON.parse(cleanedText);
    } catch (error) {
      console.error("Error parsing movie recommendations:", error);
      movieRecommendations = [];
    }
    console.log(movieRecommendations);
  
      if (movieRecommendations.length === 0) {
        console.log("No recommendations found.");
        setContent([]);
        setNumOfPages(0);
        return;
      }
  
      const movieDetailsPromises = movieRecommendations.map((movie) =>
        axios.get(
          `https://api.themoviedb.org/3/search/movie?api_key=${process.env.REACT_APP_API_KEY}&language=en-US&query=${encodeURIComponent(
            movie
          )}&page=1&include_adult=false`
        )
      );
  
      const movieDetailsResponses = await Promise.all(movieDetailsPromises);
      const detailedMovies = movieDetailsResponses.map(
        (response) => response.data.results[0] // Take the first result for each movie title
      );
  
      console.log(detailedMovies); // Contains detailed info for each movie
      setContent(detailedMovies);
      setNumOfPages(1); // Adjust pagination based on your UI/UX needs
    } catch (error) {
      console.error("Error fetching movie recommendations or details:", error);
    }
  };
  
  useEffect(() => {
    window.scroll(0, 0);
    fetchSearch();
    // eslint-disable-next-line
  }, [type, page]);

  return (
    <div>
      <ThemeProvider theme={darkTheme}>
        <div className="search">
          <TextField
            style={{ flex: 1 }}
            className="searchBox"
            label="Search"
            variant="filled"
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button
            onClick={fetchSearch}
            variant="contained"
            style={{ marginLeft: 10 }}
          >
            <SearchIcon fontSize="large" />
          </Button>
        </div>
        <Tabs
          value={type}
          indicatorColor="primary"
          textColor="primary"
          onChange={(event, newValue) => {
            setType(newValue);
            setPage(1);
          }}
          style={{ paddingBottom: 5 }}
          aria-label="disabled tabs example"
        >
          <Tab style={{ width: "50%" }} label="Search Movies" />
          <Tab style={{ width: "50%" }} label="Search TV Series" />
          <Tab style={{ width: "50%" }} label="GPT Recommendation" />
        </Tabs>
      </ThemeProvider>
      <div className="trending">
        {content &&
          content.map((c) => (
            <SingleContent
              key={c.id}
              id={c.id}
              poster={c.poster_path}
              title={c.title || c.name}
              date={c.first_air_date || c.release_date}
              media_type={type ? "tv" : "movie"}
              vote_average={c.vote_average}
            />
          ))}
        {searchText &&
          !content &&
          (type ? <h2>No Series Found</h2> : <h2>No Movies Found</h2>)}
      </div>
      {numOfPages > 1 && (
        <CustomPagination setPage={setPage} numOfPages={numOfPages} />
      )}
    </div>
  );
};

export default Search;
