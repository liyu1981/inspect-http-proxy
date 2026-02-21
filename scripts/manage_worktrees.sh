#!/bin/bash

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

get_worktrees() {
    # Get all worktrees except the main one
    # We want to filter only those inside worktrees/ directory
    mapfile -t all_worktrees < <(git worktree list --porcelain)
    
    worktrees=()
    local current_path=""
    local current_branch=""
    
    process_entry() {
        if [[ -n "$current_path" && "$current_path" == *"worktrees/"* ]]; then
            # Check status
            local status_text=""
            local status_color=""
            if [ -d "$current_path" ]; then
                if [ -n "$(git -C "$current_path" status --porcelain)" ]; then
                    status_text="dirty"
                    status_color="${RED}"
                else
                    status_text="clean"
                    status_color="${GREEN}"
                fi
            else
                status_text="missing"
                status_color="${RED}"
            fi
            
            # Relative path for display
            local rel_path=${current_path#$PWD/}
            
            # If current_branch is empty, it might be detached
            if [ -z "$current_branch" ]; then
                current_branch="(detached)"
            fi

            # Format: branch[Tab]rel_path[Tab]status_with_color[Tab]full_path[Tab]status_text
            worktrees+=("$current_branch	$rel_path	${status_color}${status_text}${NORMAL}	$current_path	$status_text")
        fi
    }

    for line in "${all_worktrees[@]}"; do
        if [[ $line =~ ^worktree\ (.*) ]]; then
            process_entry
            current_path="${BASH_REMATCH[1]}"
            current_branch=""
        elif [[ $line =~ ^branch\ refs/heads/(.*) ]]; then
            current_branch="${BASH_REMATCH[1]}"
        fi
    done
    process_entry # process the last one

    if [ ${#worktrees[@]} -eq 0 ]; then
        echo "${YELLOW}No active worktrees found in worktrees/ directory.${NORMAL}"
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

    echo "${BLUE}${BOLD}================================================================================================${NORMAL}"
    echo "${BLUE}${BOLD} MANAGE WORKTREES${NORMAL}"
    echo " ${YELLOW}Use UP/DOWN arrows to navigate, ENTER to select for removal${NORMAL}"
    echo " ${YELLOW}Press 'r' to refresh, 'q' to quit${NORMAL}"
    echo "${BLUE}${BOLD}================================================================================================${NORMAL}"
    printf "  %-60s %-10s %s\n" "BRANCH" "STATUS" "PATH"
    echo "  ------------------------------------------------------------------------------------------------"

    for i in "${!list[@]}"; do
        IFS=$'\t' read -r branch rel_path status full_path status_text <<< "${list[$i]}"
        
        # We need to be careful with printf and colors for alignment
        # So we print pieces
        if [ $i -eq $selected ]; then
            printf "${GREEN}${REVERSE}> %-60s %-10b %s${NORMAL}\n" "$branch" "$status" "$rel_path"
        else
            printf "  %-60s %-10b %s\n" "$branch" "$status" "$rel_path"
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
    if ! get_worktrees; then
        exit 0
    fi

    selected=0
    count=${#worktrees[@]}

    # Hide cursor
    tput civis
    # Save cursor position
    tput sc

    # Handle input
    while true; do
        tput rc # Restore cursor to saved position
        draw_list "$selected" "$count" "${worktrees[@]}"

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
            break # Break inner loop to refresh
        elif [[ "$key" == "" ]]; then # Enter
            IFS=$'\t' read -r branch rel_path status full_path status_text <<< "${worktrees[$selected]}"
            
            cleanup
            echo ""
            echo "${YELLOW}Selected worktree: $branch ($rel_path)${NORMAL}"
            echo "${YELLOW}Are you sure you want to remove it? (y/N)${NORMAL}"
            read -n 1 -r confirm
            echo ""
            if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
                echo "${CYAN}Removing worktree at $full_path...${NORMAL}"
                
                git_args=("worktree" "remove")
                
                if [ "$status_text" == "dirty" ]; then
                    echo "${YELLOW}Worktree is dirty. Force removal? (y/N)${NORMAL}"
                    read -n 1 -r force_confirm
                    echo ""
                    if [[ "$force_confirm" == "y" || "$force_confirm" == "Y" ]]; then
                        git_args+=("--force")
                    else
                        echo "${RED}Skipping removal.${NORMAL}"
                        git_args=()
                    fi
                fi

                if [ ${#git_args[@]} -gt 0 ]; then
                    git_args+=("$full_path")
                    if git "${git_args[@]}"; then
                        echo "${GREEN}Successfully removed worktree from git.${NORMAL}"
                        
                        # Fallback for "Directory not empty" error
                        if [ -d "$full_path" ]; then
                            echo "${YELLOW}Directory $full_path still exists (likely due to untracked/ignored files).${NORMAL}"
                            echo "${YELLOW}Manually remove directory '$full_path'? (y/N)${NORMAL}"
                            read -n 1 -r rm_confirm
                            echo ""
                            if [[ "$rm_confirm" == "y" || "$rm_confirm" == "Y" ]]; then
                                if rm -rf "$full_path"; then
                                    echo "${GREEN}Successfully removed directory.${NORMAL}"
                                else
                                    echo "${RED}Failed to remove directory.${NORMAL}"
                                fi
                            fi
                        fi
                        
                        if [ "$branch" != "(detached)" ]; then
                            echo "${YELLOW}Do you also want to delete the branch '$branch'? (y/N)${NORMAL}"
                            read -n 1 -r confirm_branch
                            echo ""
                            if [[ "$confirm_branch" == "y" || "$confirm_branch" == "Y" ]]; then
                                 if git branch -D "$branch"; then
                                     echo "${GREEN}Deleted branch '$branch'.${NORMAL}"
                                 else
                                     echo "${RED}Failed to delete branch '$branch'. It might be checked out elsewhere.${NORMAL}"
                                 fi
                            fi
                        fi
                    else
                        echo "${RED}Failed to remove worktree.${NORMAL}"
                    fi
                fi
            else
                echo "Cancelled."
            fi
            
            echo "${CYAN}Press any key to continue...${NORMAL}"
            read -rsn1
            break # Refresh list after action
        fi
    done
done
