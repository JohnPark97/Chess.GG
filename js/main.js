/**
 * Load data from CSV file asynchronously and render charts
 */
let selected_player = "";
let selected_filters = [];
let player_rating_arr = [];
let curr_moves = [];
let move_history = [];

//TODO think of a way to pre-load average ratings when the system runs so the lag doesn't occur
//while selecting bars
d3.csv('data/games.csv').then(data => {

    // Convert columns to numerical values
    data.forEach(d => {
        Object.keys(d).forEach(attr => {
            if (attr == 'black_rating' || attr == 'created_at' || attr == 'last_move_at'
                && attr == 'opening_ply' || attr == 'turns' || attr == 'white_rating') {
                d[attr] = +d[attr];
            }
        })

        // Calculate average rating for each game
        d.average_rating = Math.floor((d.black_rating + d.white_rating)/2);

        // Calculate skill level category for each game (Master/Advanced/Intermediate/Beginner)
        if(d.average_rating >= 2000) {
            d.skill_level = "Master";
        } else if (d.average_rating >= 1500 && d.average_rating < 2000) {
            d.skill_level = "Advanced";

        } else if (d.average_rating >= 1000 && d.average_rating < 1500) {
            d.skill_level = "Intermediate";
        } else {
            d.skill_level = "Beginner";
        }
        });

    const dispatcher = d3.dispatch('filter_opening', 'filter_player', 'filter_opponent', 'filter_chess_board', 'filter_color');

    loadAvgPlayerRating(data);
    loadInteractions(dispatcher);
    loadViews(data, dispatcher);
    loadInitialChessBoard();
});

function loadInteractions(dispatcher) {
    // deselect all button interaction
    d3.select('#deselect-all')
        .on("click", function(event, d) {
            // deselect all users that were selected before
            d3.selectAll('.bar.active').attr("fill", "#bfffc3")
            d3.selectAll('.bar.active').classed('active', false);

            // deselect all players
            d3.selectAll('.username.active').attr("fill", '#00052d')
            d3.selectAll('.username.active').classed('active', false);

            dispatcher.call('filter_opening', event, []);
        });

    // give button interaction in match history view
    d3.select('#selectButton')
        .on("change", function(event, d) {
            dispatcher.call('filter_opponent', event);
        });

}

function loadViews(data, dispatcher) {

    const sankey = new Sankey({
        parentElement: '#sankey-diagram',
    }, data, dispatcher);

    const horizontal_bar_chart = new HorizontalBarChart({
        parentElement: '#horizontal-bar-chart',
    }, data, dispatcher);

    const play_text_chart = new PlayTextChart({
        parentElement: '#play-text-chart',
    }, data);

    const top_user_table = new UserTable({
        parentElement: '#top-user-table',
    }, data, dispatcher);

    const user_move_table = new UserMoveTable({
        parentElement: '#user-move-table',
    }, data, dispatcher);

    const player_profile = new PlayerProfileChart({
        parentElement: '#player-profile',
    }, data);

    const player_match_histroy = new PlayerMatchHistory({
        parentElement: '#player-match-history',
    }, [], dispatcher);

    const win_rate_bar_chart = new WinRateBarChart({
        parentElement: '#win-rate-bar-chart',
    }, data, dispatcher);

    const rating_scatter_plot = new RatingScatterPlot({
        parentElement: '#rating-scatter-plot',
    }, data, dispatcher);

    // dispatcher listening to opening name filter from the horizontal barchart
    dispatcher.on('filter_opening', function(selectedOpenings) {
        if (selectedOpenings.length == 0) {
            sankey.data = data;
            top_user_table.data = data;
            user_move_table.data = data;
            win_rate_bar_chart.data = data;
            rating_scatter_plot.data = data;
            selected_filters = [];
        } else {
            sankey.data = data.filter(d => selectedOpenings.includes(d.opening_name));
            top_user_table.data = data.filter(d => selectedOpenings.includes(d.opening_name));
            user_move_table.data = data.filter(d => selectedOpenings.includes(d.opening_name));
            win_rate_bar_chart.data = data.filter(d => selectedOpenings.includes(d.opening_name));
            rating_scatter_plot.data = data.filter(d => selectedOpenings.includes(d.opening_name));
            selected_filters = selectedOpenings;
        }
        sankey.updateVis();
        top_user_table.updateVis();
        user_move_table.updateVis();
        win_rate_bar_chart.updateVis();
        rating_scatter_plot.updateVis();
        horizontal_bar_chart.updateFilter();
    });

    dispatcher.on('filter_player', function(selectedPlayer) {
        if (!selectedPlayer) {
            player_profile.data = data;
            player_match_histroy.data = data;
        } else {
            //player_profile.data = data.filter(d => selectedPlayer == d.white_id || selectedPlayer == d.black_id);
            player_match_histroy.data = data.filter(d => selectedPlayer == d.white_id || selectedPlayer == d.black_id);
        }

        //update player name
        d3.select('#player-name-text')
            .join('text')
            .text(selectedPlayer);

        selected_player = selectedPlayer;

        //reset the button index to 0
        d3.select("#selectButton").node().selectedIndex = 0;
        player_profile.updateVis();
        player_match_histroy.updateVis();
        loadInitialChessBoard();
    });

    dispatcher.on('filter_opponent', function() {
        player_match_histroy.renderVis();
        loadInitialChessBoard();
    })

    //selectedMoveId is basically an idex of the move in move_history
    dispatcher.on('filter_chess_board', function (selectedMoveId, isActive) {
        //TODO: think of a way to pre-load the data once moves is viewed and keep using that data
        if (isActive) {
            loadInitialChessBoard();
        } else {
            loadBoardHistory();
            loadChessboard(selectedMoveId);
        }
    })

    dispatcher.on('filter_color', function (selectedColor, isActive) {
        let filtered_data = data;
        if (selected_filters.length != 0) {
            filtered_data = data.filter(d => selected_filters.includes(d.opening_name));
        }
        if (isActive) {
            selectedColor = "";
        }

        if (!selectedColor) {
            rating_scatter_plot.data = filtered_data;
        } else {
            rating_scatter_plot.data = filtered_data.filter(d => d.winner == selectedColor);
        }

        rating_scatter_plot.updateVis();
    })
}

// These functions underneath are used to handle the logic for the chess board
function loadAvgPlayerRating(data) {
    let white_rating_map = new Map(d3.rollup(data, v => (d3.sum(v, d => d.white_rating) / v.length).toFixed(0), d => d.white_id));
    let black_rating_map = new Map(d3.rollup(data, v => (d3.sum(v, d => d.black_rating) / v.length).toFixed(0), d => d.black_id));

    //convert map to an array
    let white_rating_array = Array.from(white_rating_map, ([name, value]) => ({ name, value }));
    let black_rating_array = Array.from(black_rating_map, ([name, value]) => ({ name, value }));

    black_rating_array.sort(function(a, b) {
        return d3.descending(a.value, b.value);
    });

    white_rating_array.sort(function(a, b) {
        return d3.descending(a.value, b.value);
    });

    let combined_array = white_rating_array.concat(black_rating_array);
    let player_rating = d3.rollup(combined_array, v => (d3.sum(v, d => d.value) / v.length).toFixed(0), d => d.name);

    player_rating_arr = Array.from(player_rating, ([name, value]) => ({ name, value }));
}

function loadInitialChessBoard() {
    move_history = [];
    let board = [
        // bR = black Rook
        ["bR","bN","bB","bQ","bK","bB","bN","bR"],
        ["bp","bp","bp","bp","bp","bp","bp","bp"],
        ['0','0','0','0','0','0','0','0'],
        ['0','0','0','0','0','0','0','0'],
        ['0','0','0','0','0','0','0','0'],
        ['0','0','0','0','0','0','0','0'],
        ["wp","wp","wp","wp","wp","wp","wp","wp"],
        ["wR","wN","wB","wQ","wK","wB","wN","wR"]
    ];
    move_history.push(board);

    //load the view
    loadChessboard(0);
}

function loadBoardHistory() {
    let board = [
        // bR = black Rook
        ["bR","bN","bB","bQ","bK","bB","bN","bR"],
        ["bp","bp","bp","bp","bp","bp","bp","bp"],
        ['0','0','0','0','0','0','0','0'],
        ['0','0','0','0','0','0','0','0'],
        ['0','0','0','0','0','0','0','0'],
        ['0','0','0','0','0','0','0','0'],
        ["wp","wp","wp","wp","wp","wp","wp","wp"],
        ["wR","wN","wB","wQ","wK","wB","wN","wR"]
    ];
    move_history = [];

    let color = 'w'
    for (let i = 0; i < curr_moves.length; i++) {
        let move = curr_moves[i];
        var temp_board = board.map(function(arr) {
            return arr.slice();
        });

        computeChessMove(move, color, temp_board);

        move_history.push(temp_board);

        // change the color
        color = changeColor(color);
        board = temp_board;
    }
}

function loadChessboard(selectedMoveId) {

    //load the view
    const curr_board = move_history[selectedMoveId];

    for (const row of rows) {
        for (const col of cols) {
            const class_name = '.coord' + row + col;

            const cur_col = translateCol(col);
            const cur_row = translateRow(row);
            const data = curr_board[cur_row][cur_col];

            d3.selectAll(class_name)
                .selectAll('text')
                .data([data])
                .join('text')
                .text(function (d) {
                    switch (d) {
                        case 'bR':
                            return '\u265C';
                        case 'bN':
                            return '\u265E';
                        case 'bB':
                            return '\u265D';
                        case 'bQ':
                            return '\u265B';
                        case 'bK':
                            return '\u265A';
                        case 'bp':
                            return '\u265F';
                        case 'wR':
                            return '\u2656';
                        case 'wN':
                            return '\u2658';
                        case 'wB':
                            return '\u2657';
                        case 'wQ':
                            return '\u2655';
                        case 'wK':
                            return '\u2654';
                        case 'wp':
                            return '\u2659';
                        default:
                            return '';
                    }
                })


        }
    }

}

function changeColor(color) {
    if (color == 'b') return 'w'
    else return 'b'
}

let cols = ['a','b','c','d','e','f','g','h']
let rows = ['8','7','6','5','4','3','2','1']
let pieces = ['N', 'B', 'R', 'Q', 'K']

function computeChessMove(move, color, temp_board) {

    // remove + and # for now
    move = move.replace("+", "");
    move = move.replace("#", "");

    let isPawn = true;
    let cur_piece = 'p';
    let new_row = 0;
    let new_col = '';
    let isOvertake = false;
    let hasPrevRow = false;
    let hasPrevCol = false;
    let prev_col = ''
    let prev_row = 0;
    let col_counter = 0;
    let row_counter = 0;

    //castling
    if (move == 'O-O' || move =='O-O-O') {
        performCastling(temp_board,color, move);
        return;
    }
    if (pieces.includes(move.substring(0,1))) {
        isPawn = false;
        cur_piece = move.substring(0,1);
    }
    // check if this is an overtaking move
    if (move.includes('x')) {
        isOvertake = true;
        move = move.replace('x', '')
    }



    // parse the movement into pieces
    // cur_piece, new_row, new_col
    let x = isPawn? 0:1;
    for (x; x < move.length; x++) {
        let ch = move.substring(x, x+1);
        if (cols.includes(ch)) {
            new_col = ch;
            col_counter++;
            continue;
        }

        if (rows.includes(ch)) {
            new_row = ch;
            row_counter++;
            continue;
        }
    }

    // check if there are 2 row info in a move
    if (row_counter == 2) {
        hasPrevRow = true;
        prev_row = move[1];
    } else if (col_counter == 2) {
        hasPrevCol = true;
        prev_col = move[1];
    }

    //switching pawn
    if (move.includes('=')) {
        performSwapping(temp_board, color, move, isOvertake);
        return;
    }

    //do the calculation

    const row = translateRow(new_row);
    const col = translateCol(new_col);
    const piece = color + cur_piece;

    // handle the case where pawn overtakes piece
    if(isOvertake && isPawn) {
        // when a pawn overtakes some piece, must set old_col to the previous spot pawn was in
        const old_col = translateCol(move.substring(0,1));

        temp_board[row][col] = piece;
        attackPawn(temp_board, row, col, piece, old_col, color);
    }
    // handle the case where pawn moves
    else if(!isOvertake && isPawn) {

        temp_board[row][col] = piece;
        movePawn(temp_board, row, col, piece, color);

    }
    // move has the previous row information
    else if(hasPrevRow) {
        prev_row = translateRow(prev_row)

        temp_board[row][col] = piece;
        switch (cur_piece) {
            case "R": // straight line
                for (let i = 0; i < 8; i++) {
                    if (temp_board[prev_row][i] == piece) {
                        temp_board[prev_row][i] = '0';
                        return;
                    }
                }
                break;
            case "B":
                // very very rare case which is hard to find the test data
                // because a player has to change a pawn to bishop not handle this for now
                console.log('rare two bishop data found');

                break;
            case "N": // search two spots
                // if diff is 2, search one row above and below
                // if diff is 1, search two rows above and below
                const diff = Math.abs(prev_row - row);
                if (diff == 2) {
                    if (temp_board[prev_row][col - 1] == piece) {
                        temp_board[prev_row][col - 1] = '0'
                        return;
                    } else if (temp_board[prev_row][col + 1] == piece) {
                        temp_board[prev_row][col + 1] = '0'
                        return;
                    }
                } else if (diff == 1) {
                    if (temp_board[prev_row][col - 2] == piece) {
                        temp_board[prev_row][col - 2] = '0'
                        return;
                    } else if (temp_board[prev_row][col + 2] == piece) {
                        temp_board[prev_row][col + 2] = '0'
                        return;
                    }
                }
                break;
            case "Q": // quite rare but happens in number of places
                for (let i = 0; i < 8; i++) {
                    if (temp_board[prev_row][i] == piece) {
                        temp_board[prev_row][i] = '0';
                        return;
                    }
                }
                // const col_below = col - Math.abs(row - prev_row)
                // const col_above = col + Math.abs(row - prev_row)
                //
                // if (col_below >= 0 && temp_board[prev_row][col_below] == piece) {
                //     temp_board[prev_row][i] = '0';
                //     return;
                // } else if (col_above < 8 && temp_board[prev_row][col_above] == piece) {
                //     temp_board[prev_row][prev_col] = '0';
                //     return;
                // } else {
                //     console.log('No Q found in diagonal range error')
                // }
                // break;
        }
    }
    // move has the previous col information
    else if(hasPrevCol) {
        prev_col = translateCol(prev_col)

        temp_board[row][col] = piece;
        switch (cur_piece) {
            case "R": // straight line
                for (let i = 0; i < 8; i++) {
                    if (temp_board[i][prev_col] == piece){
                        temp_board[i][prev_col] = '0';
                        return;
                    }
                }
                break;
            case "B":
                // very very rare case which is hard to find the test data
                // because a player has to change a pawn to bishop not handle this for now
                console.log('rare two bishop data found');

                break;
            case "N": // search two spots
                // if diff is 2, search one row above and below
                // if diff is 1, search two rows above and below
                const diff = Math.abs(prev_col - col);
                if (diff == 2) {
                    if (temp_board[row-1][prev_col] == piece) {
                        temp_board[row-1][prev_col] = '0'
                        return;
                    } else if (temp_board[row+1][prev_col] == piece) {
                        temp_board[row+1][prev_col] = '0'
                        return;
                    }
                } else if (diff == 1) {
                    if (temp_board[row-2][prev_col] == piece) {
                        temp_board[row-2][prev_col] = '0'
                        return;
                    } else if (temp_board[row+2][prev_col] == piece) {
                        temp_board[row+2][prev_col] = '0'
                        return;
                    }
                }
                break;
            case "Q": // quite rare but happens in number of places
                // this doesn't check the case where two queens are in the same column
                for (let i = 0; i < 8; i++) {
                    if (temp_board[i][prev_col] == piece){
                        temp_board[i][prev_col] = '0';
                        return;
                    }
                }
                // const row_below = row - Math.abs(col - prev_col)
                // const row_above = row + Math.abs(col - prev_col)
                //
                // if (row_below >= 0 && temp_board[row_below][prev_col] == piece) {
                //     temp_board[i][prev_col] = '0';
                //     return;
                // } else if (row_above < 8 && temp_board[row_above][prev_col] == piece) {
                //     temp_board[i][prev_col] = '0';
                //     return;
                // } else {
                //     console.log('No Q found in diagonal range error')
                // }
                break;
        }

    }
    // handle the case where non-pawns move
    else if(!isPawn) {

        temp_board[row][col] = piece;


        switch (cur_piece) {
            case "B": // search for a bishop
                searchBishop(temp_board, row, col, piece);
                break;

            case "N": //search for a night
                searchNight(temp_board,row,col, piece);
                break;

            case "R": //search for a rook
                searchRook(temp_board, row, col, piece)
                break;
            case "Q":
                searchQueen(temp_board, row, col, piece);
                break;
            case "K":
                searchKing(temp_board, row, col, piece);
                break;
        }
    }

}

function searchQueen(temp_board, row, col, piece) {
    searchBishop(temp_board, row, col, piece)
    searchRook(temp_board, row, col, piece);
}

function performSwapping(temp_board, color, move, isOvertake) {
    move = move.replace('=', '');

    let cur_piece = 'p';
    let new_row = 0;
    let prev_col = 'a';

    let new_col = move.substring(0,1);

    if (isOvertake) {
        new_col = translateCol(move.substring(1,2));
        prev_col = translateCol(move.substring(0,1));
        new_row = translateRow(move.substring(2,3));
        cur_piece = move.substring(3,4);
        new_piece = color+cur_piece;

        temp_board[new_row][new_col] = new_piece;

        if (color == 'w') {
            temp_board[new_row+1][prev_col] = '0'
        } else {
            temp_board[new_row-1][prev_col] = '0'
        }

    } else {
        for (let x = 1; x < move.length; x++) {
            let ch = move.substring(x, x+1);

            if (rows.includes(ch)) {
                new_row = ch;
                continue;
            } else if (pieces.includes(ch)) {
                cur_piece = ch;
                continue;
            }
        }
        new_row = translateRow(new_row)
        new_col = translateCol(new_col)
        new_piece = color+cur_piece;
        temp_board[new_row][new_col] = new_piece;

        if (color == 'w') {
            temp_board[new_row+1][new_col] = '0'
        } else {
            temp_board[new_row-1][new_col] = '0'
        }
    }
}

function performCastling(temp_board, color, move) {
    // white side
    let row = 7;

    if (color != 'w') {
        row = 0;
    }

    //white king shouldn't have moved
    const king = temp_board[row][4];

    //if queen side castling
    if (move == 'O-O-O') {
        //rook shouldn't have moved
        const rook = temp_board[row][0];
        temp_board[row][2] = king;
        temp_board[row][3] = rook;

        temp_board[row][0] = '0';
    } else {
        //rook shouldn't have moved
        const rook = temp_board[row][7];
        temp_board[row][6] = king;
        temp_board[row][5] = rook;

        temp_board[row][7] = '0';
    }

    temp_board[row][4] = '0';

}

function searchKing(temp_board, row, col, piece) {

    //check 8 places from the spot starting from left top
    let temp_row = row - 1;
    let temp_col = col - 1;
    if (temp_row >= 0 && temp_col >= 0) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

    temp_row = row - 1;
    temp_col = col;
    if (temp_row >= 0 && temp_col >= 0) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

    temp_row = row - 1;
    temp_col = col + 1;
    if (temp_row >= 0 && temp_col < 8) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

    temp_row = row;
    temp_col = col + 1;
    if (temp_row >= 0 && temp_col < 8) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

    temp_row = row + 1;
    temp_col = col + 1;
    if (temp_row < 8 && temp_col < 8) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

    temp_row = row + 1;
    temp_col = col;
    if (temp_row < 8 && temp_col < 8) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

    temp_row = row + 1;
    temp_col = col - 1;
    if (temp_row < 8 && temp_col >= 0) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

    temp_row = row;
    temp_col = col - 1;
    if (temp_row < 8 && temp_col >= 0) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

}

function attackPawn(temp_board, row, col, piece, old_col, color) {
    if (color == 'w') {
        if (temp_board[row + 1][old_col] == piece) {
            temp_board[row + 1][old_col] = '0'
            return;
        }
        // if white, need to increase index
    } else {
        if (temp_board[row - 1][old_col] == piece) {
            temp_board[row - 1][old_col] = '0'
            return;
        }
    }
}

function movePawn(temp_board, row, col, piece, color) {
    if (color != 'w') {
        for (let i = row - 1; i >= 0; i--) {
            if (temp_board[i][col] == piece) {
                temp_board[i][col] = '0'
                break;
            }
        }
        // if white, need to increase index
    } else {
        // 8 because there can only be max index 7
        for (let i = row + 1; i < 8; i++) {
            if (temp_board[i][col] == piece) {
                temp_board[i][col] = '0'
                break;
            }
        }
    }
}

function searchNight(temp_board, row, col, piece) {
    //check 8 places from the spot starting from left top
    let temp_row = row - 1;
    let temp_col = col - 2;
    if (temp_row >= 0 && temp_col >= 0) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

    temp_row = row - 2;
    temp_col = col - 1;
    if (temp_row >= 0 && temp_col >= 0) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

    temp_row = row - 2;
    temp_col = col + 1;
    if (temp_row >= 0 && temp_col < 8) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

    temp_row = row - 1;
    temp_col = col + 2;
    if (temp_row >= 0 && temp_col < 8) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

    temp_row = row + 1;
    temp_col = col + 2;
    if (temp_row < 8 && temp_col < 8) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

    temp_row = row + 2;
    temp_col = col + 1;
    if (temp_row < 8 && temp_col < 8) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

    temp_row = row + 2;
    temp_col = col - 1;
    if (temp_row < 8 && temp_col >= 0) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

    temp_row = row + 1;
    temp_col = col - 2;
    if (temp_row < 8 && temp_col >= 0) {
        if (temp_board[temp_row][temp_col] == piece) {
            temp_board[temp_row][temp_col] = '0';
            return;
        }
    }

}

function searchBishop(temp_board, row, col, piece) {
    // search left diagonal
    let temp_row = row - 1;
    let temp_col = col - 1;
    while(temp_row >= 0 && temp_col >= 0) {
        if (temp_board[temp_row][temp_col] == piece){
            temp_board[temp_row][temp_col] = '0';
            return;
        } else if (temp_board[temp_row][temp_col] == '0') {
            temp_row--;
            temp_col--;
        } else {
            break;
        }
    }

    temp_row = row - 1;
    temp_col = col + 1;
    // search right diagonal
    while(temp_row >= 0 && temp_col < 8) {
        if (temp_board[temp_row][temp_col] == piece){
            temp_board[temp_row][temp_col] = '0';
            return;
        } else if (temp_board[temp_row][temp_col] == '0') {
            temp_row--;
            temp_col++;
        } else {
            break;
        }
    }

    temp_row = row + 1;
    temp_col = col - 1;
    // search left bot diagonal
    while(temp_row <8 && temp_col >= 0) {
        if (temp_board[temp_row][temp_col] == piece){
            temp_board[temp_row][temp_col] = '0';
            return;
        } else if (temp_board[temp_row][temp_col] == '0') {
            temp_row++;
            temp_col--;
        } else {
            break;
        }
    }
    temp_row = row + 1;
    temp_col = col + 1;
    // search right bot diagonal
    while(temp_row < 8 && temp_col < 8) {
        if (temp_board[temp_row][temp_col] == piece){
            temp_board[temp_row][temp_col] = '0';
            return;
        } else if (temp_board[temp_row][temp_col] == '0') {
            temp_row++;
            temp_col++;
        } else {
            break;
        }
    }
}

function searchRook(temp_board, row, col, piece) {
    // search left
    let temp_row = row;
    let temp_col = col - 1;
    while(temp_col >= 0) {
        if (temp_board[temp_row][temp_col] == piece){
            temp_board[temp_row][temp_col] = '0';
            return;
        } else if (temp_board[temp_row][temp_col] == '0') {
            temp_col--;
        } else {
            break;
        }
    }

    temp_row = row;
    temp_col = col + 1;
    // search right
    while(temp_col < 8) {
        if (temp_board[temp_row][temp_col] == piece){
            temp_board[temp_row][temp_col] = '0';
            return;
        } else if (temp_board[temp_row][temp_col] == '0') {
            temp_col++;
        } else {
            break;
        }
    }

    temp_row = row - 1;
    temp_col = col;
    // search up
    while(temp_row >= 0) {
        if (temp_board[temp_row][temp_col] == piece){
            temp_board[temp_row][temp_col] = '0';
            return;
        } else if (temp_board[temp_row][temp_col] == '0') {
            temp_row--;
        } else {
            break;
        }
    }
    temp_row = row + 1;
    temp_col = col;
    // search down
    while(temp_row < 8) {
        if (temp_board[temp_row][temp_col] == piece){
            temp_board[temp_row][temp_col] = '0';
            return;
        } else if (temp_board[temp_row][temp_col] == '0') {
            temp_row++;
        } else {
            break;
        }
    }

}

function translateRow(row) {
    // index 0 == row 8, index 1 = row 7, index 2 = row 6, index 3 = row 5
    // index 4 == row 4, index 5 = row 3, index 6 = row 2, index 7 = row 1
    return 8 - row;
}

function translateCol(col) {
    switch (col){
        case 'a':
            return 0;
        case 'b':
            return 1;
        case 'c':
            return 2;
        case 'd':
            return 3;
        case 'e':
            return 4;
        case 'f':
            return 5;
        case 'g':
            return 6;
        case 'h':
            return 7;
    }
}