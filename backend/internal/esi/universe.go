package esi

func IsWormholeSystem(systemID int) bool {
	// Wormhole IDs start with 31000000
	return systemID >= 31000000 && systemID < 32000000
}
