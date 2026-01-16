import React, { useState } from "react";

type Props = {
    onSearch: (searchValue: string) => void;
}

function SearchBar({ onSearch }: Props) {
  const [searchValue, setSearchValue] = useState("");

  const handleSearch = () => {
    if (searchValue.trim()) {
      onSearch(searchValue);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <>
    <div className="search-bar">
      <input
        type="text"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Enter a team name..."
      />
      <button type="button" onClick={handleSearch}>Search</button>
    </div>
    </>
  );
}

export default SearchBar;
