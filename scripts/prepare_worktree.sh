#!/bin/bash

# Ensure gh is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    exit 1
fi

# Ensure worktrees directory exists
mkdir -p worktrees

# Colors
if [ -t 1 ]; then
    ncolors=$(tput colors)
    if [ -n "$ncolors" ] && [ "$ncolors" -ge 8 ]; then
        BOLD=$(tput bold)
        UNDERLINE=$(tput smul)
        NORMAL=$(tput sgr0)
        RED=$(tput setaf 1)
        GREEN=$(tput setaf 2)
        YELLOW=$(tput setaf 3)
        BLUE=$(tput setaf 4)
        CYAN=$(tput setaf 6)
        REVERSE=$(tput rev)
    fi
fi

fetch_issues() {
    echo "${CYAN}Fetching open issues from GitHub...${NORMAL}"
    # Fetch issues into an array
    # Format: Number[Tab]Title
    mapfile -t issues < <(gh issue list --state open --limit 50 --json number,title --template '{{range .}}{{.number}}	{{.title}}{{"\n"}}{{end}}')

    if [ ${#issues[@]} -eq 0 ]; then
        echo "${YELLOW}No open issues found.${NORMAL}"
        return 1
    fi
    return 0
}

# Function to draw the list
draw_list() {
    local selected=$1
    local count=$2
    local start_index=$3
    shift 3
    local list=("$@")
    
    # Get terminal height
    local term_height=$(tput lines)
    # Header takes 5 lines, footer (if any) could take some too.
    # Let's use max 15 items to be safe and avoid scrolling.
    local max_items=$((term_height - 10))
    if [ $max_items -lt 5 ]; then max_items=5; fi
    
    # Ensure selected is within the visible window
    # This logic is handled in the main loop now for better control

    # Clear screen from top left
    tput cup 0 0
    tput ed

    echo "${BLUE}${BOLD}==================================================${NORMAL}"
    echo "${BLUE}${BOLD} SELECT AN ISSUE TO PREPARE WORKTREE${NORMAL}"
    echo " ${YELLOW}Use UP/DOWN arrows to navigate, ENTER to select${NORMAL}"
    echo " ${YELLOW}Press 'r' to refetch, 'q' to quit${NORMAL}"
    echo "${BLUE}${BOLD}==================================================${NORMAL}"

    local end_index=$((start_index + max_items))
    [ $end_index -gt $count ] && end_index=$count

    for ((i=start_index; i<end_index; i++)); do
        if [ $i -eq $selected ]; then
            # Highlight selected row
            echo "${GREEN}${REVERSE}> ${list[$i]}${NORMAL}"
        else
            echo "  ${list[$i]}"
        fi
    done
    
    # If there are more issues, show indicator
    if [ $end_index -lt $count ]; then
        echo "  ${YELLOW}... and $((count - end_index)) more ...${NORMAL}"
    fi
    if [ $start_index -gt 0 ]; then
        echo "  ${YELLOW}... and $start_index more above ...${NORMAL}"
    fi
}

cleanup() {
    tput cnorm # Show cursor
    tput rmcup # Restore screen buffer
}

# Trap for unexpected exits
trap "cleanup; exit" INT TERM

# Enter alternate screen buffer
tput smcup

while true; do
    if ! fetch_issues; then
        tput rmcup
        exit 0
    fi

    selected=0
    start_index=0
    count=${#issues[@]}

    # Hide cursor
    tput civis

    # Handle input
    while true; do
        # Calculate start_index for scrolling
        # Get terminal height again in case it resized
        term_height=$(tput lines)
        max_items=$((term_height - 10))
        [ $max_items -lt 5 ] && max_items=5

        if [ $selected -lt $start_index ]; then
            start_index=$selected
        elif [ $selected -ge $((start_index + max_items)) ]; then
            start_index=$((selected - max_items + 1))
        fi

        draw_list "$selected" "$count" "$start_index" "${issues[@]}"

        # Read input
        read -rsn1 key
        
        # Handle escape sequences (arrows)
        if [[ "$key" == $'\e' ]]; then
            read -rsn2 -t 0.1 next_chars
            case "$next_chars" in
                '[A') # Up arrow
                    ((selected--))
                    [ $selected -lt 0 ] && selected=$((count - 1))
                    ;;
                '[B') # Down arrow
                    ((selected++))
                    [ $selected -ge $count ] && selected=0
                    ;;
            esac
        elif [[ "$key" == "q" ]]; then
            cleanup
            echo "Exiting."
            exit 0
        elif [[ "$key" == "r" ]]; then
            # Clean up before refetching because fetch_issues prints to stdout
            # which we might want to see, or we might want to stay in smcup.
            # Let's stay in smcup but clear screen.
            tput cup 0 0
            tput ed
            echo "${CYAN}Refetching...${NORMAL}"
            break # Break inner loop to refetch
        elif [[ "$key" == "" ]]; then # Enter
            # Save selection before cleanup
            selected_issue="${issues[$selected]}"
            cleanup
            
            # Extract issue number (first column) and title (rest of the line)
            ISSUE_NUMBER=$(echo "$selected_issue" | awk '{print $1}')
            ISSUE_TITLE=$(echo "$selected_issue" | cut -f2-)
            
            # Slugify the title
            SLUG=$(echo "$ISSUE_TITLE" | tr '[:upper:]' '[:lower:]' | sed -e 's/[^a-z0-9]/-/g' -e 's/--*/-/g' -e 's/^-//' -e 's/-$//' | cut -c 1-50)
            
            BRANCH_NAME="feat_issue-${ISSUE_NUMBER}-${SLUG}"
            WORKTREE_PATH="./worktrees/${BRANCH_NAME}"
            
            if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
                echo "${RED}Error: Branch '$BRANCH_NAME' already exists.${NORMAL}"
                exit 1
            fi
            
            if [ -d "$WORKTREE_PATH" ]; then
                echo "${RED}Error: Directory $WORKTREE_PATH already exists.${NORMAL}"
                exit 1
            fi
            
            echo "${CYAN}Creating worktree for branch '$BRANCH_NAME' at '$WORKTREE_PATH'...${NORMAL}"
            git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"
            
            echo ""
            echo "${GREEN}${BOLD}Successfully created worktree!${NORMAL}"
            echo "To start working:"
            echo "  ${CYAN}cd $WORKTREE_PATH${NORMAL}"
            echo "  ${CYAN}scripts/prepare_dev.sh${NORMAL}"
            echo ""

            read -p "Do you want to cd to $WORKTREE_PATH and run prepare_dev.sh now? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                cd "$WORKTREE_PATH" || exit 1
                echo "${CYAN}Running prepare_dev.sh...${NORMAL}"
                bash ./scripts/prepare_dev.sh
                echo ""
                echo "${GREEN}${BOLD}Preparation complete!${NORMAL}"
                echo "${YELLOW}Starting a new shell in $WORKTREE_PATH. Type 'exit' to return to the original directory.${NORMAL}"
                exec $SHELL
            fi
            exit 0
        fi
    done
done
