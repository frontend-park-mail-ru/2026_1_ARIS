import type { GameRoom } from "../../../api/games";
import { isCurrentRoomCreator } from "./selectors";

const publicLobbyStartSoundUrl = "/assets/audio/combined_without_10_11.mp3";
const playedStartSoundKeys = new Set<string>();
let publicLobbyStartAudio: HTMLAudioElement | null = null;
let soundPlayGeneration = 0;

function getPublicLobbyStartSoundKey(room: GameRoom): string {
  return `${room.id}:${room.nextQuestionAt || room.currentQuestion?.id || "start"}`;
}

function getPublicLobbyStartAudio(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!publicLobbyStartAudio) {
    publicLobbyStartAudio = new Audio(publicLobbyStartSoundUrl);
    publicLobbyStartAudio.preload = "auto";
  }
  return publicLobbyStartAudio;
}

function isPublicLobbyStartSoundRecipient(room: GameRoom, currentProfileId: string): boolean {
  if (currentProfileId) return room.createdByProfileId === currentProfileId;
  return isCurrentRoomCreator(room, "");
}

export function shouldPlayPublicLobbyStartSound(
  previousRoom: GameRoom | null,
  nextRoom: GameRoom,
  currentProfileId: string,
): boolean {
  return Boolean(
    previousRoom?.id === nextRoom.id &&
    previousRoom.status === "waiting" &&
    nextRoom.status === "active" &&
    nextRoom.isPublicLobby &&
    isPublicLobbyStartSoundRecipient(nextRoom, currentProfileId),
  );
}

export function playPublicLobbyStartSound(
  previousRoom: GameRoom | null,
  nextRoom: GameRoom,
  currentProfileId: string,
): void {
  if (!shouldPlayPublicLobbyStartSound(previousRoom, nextRoom, currentProfileId)) return;

  const soundKey = getPublicLobbyStartSoundKey(nextRoom);
  if (playedStartSoundKeys.has(soundKey)) return;
  playedStartSoundKeys.add(soundKey);

  const audio = getPublicLobbyStartAudio();
  if (!audio) return;

  soundPlayGeneration += 1;
  audio.muted = false;
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}

export function primePublicLobbyStartSound(room: GameRoom | null, currentProfileId: string): void {
  if (!room?.isPublicLobby || !isPublicLobbyStartSoundRecipient(room, currentProfileId)) return;

  const audio = getPublicLobbyStartAudio();
  if (!audio) return;

  const generation = soundPlayGeneration;
  audio.muted = true;
  void audio
    .play()
    .then(() => {
      if (soundPlayGeneration !== generation) return;
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    })
    .catch(() => {
      audio.muted = false;
    });
}

export function resetPublicLobbyStartSoundForTests(): void {
  playedStartSoundKeys.clear();
  publicLobbyStartAudio = null;
  soundPlayGeneration = 0;
}
