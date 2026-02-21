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
    shift 2
    local list=("$@")

    # Clear screen from cursor down to ensure clean redraw
    tput ed

    echo "${BLUE}${BOLD}==================================================${NORMAL}"
    echo "${BLUE}${BOLD} SELECT AN ISSUE TO PREPARE WORKTREE${NORMAL}"
    echo " ${YELLOW}Use UP/DOWN arrows to navigate, ENTER to select${NORMAL}"
    echo " ${YELLOW}Press 'r' to refetch, 'q' to quit${NORMAL}"
    echo "${BLUE}${BOLD}==================================================${NORMAL}"

    for i in "${!list[@]}"; do
        if [ $i -eq $selected ]; then
            # Highlight selected row
            echo "${GREEN}${REVERSE}> ${list[$i]}${NORMAL}"
        else
            echo "  ${list[$i]}"
        fi
    done
}

cleanup() {
    tput cnorm # Show cursor
    tput rc    # Restore cursor position
    tput ed    # Clear following text
}

# Trap for unexpected exits
trap "cleanup; exit" INT TERM

while true; do
    if ! fetch_issues; then
        exit 0
    fi

    selected=0
    count=${#issues[@]}

    # Hide cursor and save position
    tput civis
    tput sc

    # Handle input
    while true; do
        tput rc # Restore cursor to saved position
        draw_list "$selected" "$count" "${issues[@]}"

        # Read input
        # -r: raw, -s: silent, -n1: one character
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
            cleanup
            echo "${CYAN}Refetching...${NORMAL}"
            break # Break inner loop to refetch
        elif [[ "$key" == "" ]]; then # Enter
            cleanup
            selected_issue="${issues[$selected]}"
            
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
            exit 0
        fi
    done
done
